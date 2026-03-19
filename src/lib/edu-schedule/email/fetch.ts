import { sampleEmailMessages } from "@/lib/edu-schedule/mock-data";
import type { EmailMessage } from "@/lib/edu-schedule/types";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { graphFetchWithRetry } from "@/lib/edu-schedule/graph";
import { getMicrosoftAuthConfigStatus } from "@/lib/auth-config";
import { logger, metrics } from "@/lib/logger";

/** Refresh 60 s before actual expiry to avoid races. */
const TOKEN_BUFFER_SECONDS = 60;

type StoredAccount = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  providerAccountId: string;
  scope: string | null;
};

/**
 * Returns a valid access token for the given account, refreshing it first if
 * it is expired or about to expire. Updates the DB record with the new tokens.
 */
async function ensureFreshToken(account: StoredAccount): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const isExpired = !account.expires_at || account.expires_at - TOKEN_BUFFER_SECONDS < nowSec;

  if (!isExpired && account.access_token) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new ApiError(
      401,
      "GRAPH_TOKEN_EXPIRED",
      "Microsoft access token expired and no refresh token is stored. Sign out and sign in again.",
    );
  }

  logger.info("graph.token_refresh_start", { providerAccountId: account.providerAccountId });
  metrics.increment("graph.token_refresh_attempt");

  const microsoft = getMicrosoftAuthConfigStatus();
  // Refresh using the scope that was already granted — never over-request.
  // This avoids triggering admin-consent prompts on org accounts.
  const grantedScope = account.scope ?? "openid profile email offline_access User.Read";
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: microsoft.clientId,
    client_secret: microsoft.clientSecret,
    refresh_token: account.refresh_token,
    scope: grantedScope,
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${microsoft.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.warn("graph.token_refresh_failed", { status: res.status, body: text.slice(0, 300) });
    throw new ApiError(
      401,
      "GRAPH_TOKEN_EXPIRED",
      "Microsoft session expired. Sign out and sign in again to refresh access.",
    );
  }

  const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  const expiresAt = nowSec + (data.expires_in ?? 3600);

  await prisma.account.update({
    where: {
      provider_providerAccountId: {
        provider: "microsoft-entra-id",
        providerAccountId: account.providerAccountId,
      },
    },
    data: {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? account.refresh_token,
      expires_at: expiresAt,
    },
  });

  logger.info("graph.token_refreshed", { providerAccountId: account.providerAccountId });
  metrics.increment("graph.token_refresh_success");

  return data.access_token;
}

export type EmailFetchOptions = {
  provider?: "mock" | "gmail" | "imap" | "microsoft-graph";
  limit?: number;
  userId?: string;
};

type GraphMessage = {
  id: string;
  subject?: string;
  receivedDateTime?: string;
  from?: { emailAddress?: { address?: string } };
  body?: { contentType?: "text" | "html"; content?: string };
  bodyPreview?: string;
};

function htmlToText(html: string) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFromMicrosoftGraph(limit: number, userId: string): Promise<EmailMessage[]> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "microsoft-entra-id" },
    orderBy: { updatedAt: "desc" },
    select: { providerAccountId: true, access_token: true, refresh_token: true, expires_at: true, scope: true },
  });

  if (!account) {
    throw new ApiError(
      409,
      "GRAPH_NOT_CONNECTED",
      "No Microsoft account linked. Sign in with your Microsoft account to connect.",
    );
  }

  // Always obtain a fresh (or refreshed) token — never send an expired one.
  const accessToken = await ensureFreshToken(account);

  // Use the Inbox folder specifically — avoids Sent, Drafts, WhatsApp notifications, etc.
  const url = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=${Math.max(1, Math.min(limit, 50))}&$select=id,subject,from,receivedDateTime,bodyPreview,body&$orderby=receivedDateTime desc`;

  logger.info("graph.fetch_messages", { userId, limit });
  metrics.increment("graph.fetch_messages");

  // Use retry-safe wrapper — retries on 429/5xx, surfaces actionable errors on others
  const response = await graphFetchWithRetry(
    url,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.body-content-type="text"',
      },
      cache: "no-store",
    },
    { context: "Microsoft Graph messages", maxAttempts: 3 },
  );

  const payload = (await response.json()) as { value?: GraphMessage[] };
  const items = payload.value ?? [];

  logger.info("graph.fetch_messages.success", { userId, count: items.length });
  metrics.increment("graph.messages_fetched", items.length);

  return items.map((item) => {
    const content = item.body?.content ?? item.bodyPreview ?? "";
    const bodyText = item.body?.contentType === "html" ? htmlToText(content) : content;

    return {
      id: item.id,
      subject: item.subject ?? "(no subject)",
      from: item.from?.emailAddress?.address ?? "unknown",
      receivedAt: item.receivedDateTime ?? new Date().toISOString(),
      bodyText,
    };
  });
}

export async function fetchEmailMessages(options: EmailFetchOptions = {}): Promise<EmailMessage[]> {
  const provider = options.provider ?? "microsoft-graph";
  const limit = options.limit ?? 10;

  if (provider === "mock") {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(
        403,
        "MOCK_DISABLED_IN_PRODUCTION",
        "Mock email provider is disabled in production. Use microsoft-graph.",
      );
    }
    return sampleEmailMessages.slice(0, limit);
  }

  if (provider === "microsoft-graph") {
    if (!options.userId) {
      throw new ApiError(400, "MISSING_USER", "User context is required for Microsoft Graph inbox fetch.");
    }
    return fetchFromMicrosoftGraph(limit, options.userId);
  }

  throw new ApiError(501, "PROVIDER_NOT_IMPLEMENTED", `Provider '${provider}' is not implemented.`);
}
