import { sampleEmailMessages } from "@/lib/edu-schedule/mock-data";
import type { EmailMessage } from "@/lib/edu-schedule/types";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";

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
    where: {
      userId,
      provider: "microsoft-entra-id",
      access_token: { not: null },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!account?.access_token) {
    throw new ApiError(409, "GRAPH_NOT_CONNECTED", "No Microsoft account token found. Please sign in again.");
  }

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?$top=${Math.max(1, Math.min(limit, 50))}&$select=id,subject,from,receivedDateTime,bodyPreview,body&$orderby=receivedDateTime desc`,
    {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        Prefer: 'outlook.body-content-type="text"',
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const text = await response.text();
    const status = response.status;

    let graphCode = "";
    let graphMessage = "";
    try {
      const parsed = JSON.parse(text) as { error?: { code?: string; message?: string } };
      graphCode = parsed.error?.code ?? "";
      graphMessage = parsed.error?.message ?? "";
    } catch {
      // keep raw text fallback
    }

    if (status === 401) {
      throw new ApiError(
        401,
        "GRAPH_TOKEN_EXPIRED",
        "Microsoft session expired. Please sign out and sign in again.",
        { status, graphCode, graphMessage, raw: text },
      );
    }
    if (status === 403) {
      throw new ApiError(
        403,
        "GRAPH_PERMISSION_DENIED",
        "Microsoft Graph denied mailbox access. Grant Mail.Read permission and consent.",
        { status, graphCode, graphMessage, raw: text },
      );
    }

    if (graphCode === "MailboxNotEnabledForRESTAPI") {
      throw new ApiError(
        422,
        "GRAPH_MAILBOX_UNAVAILABLE",
        "This Microsoft mailbox is not enabled for Graph mail API access. Use a personal Microsoft account for testing, or ask your school IT admin to enable Exchange Online mailbox REST/Graph access.",
        { status, graphCode, graphMessage, raw: text },
      );
    }

    throw new ApiError(
      502,
      "GRAPH_FETCH_FAILED",
      `Failed to fetch Microsoft inbox (HTTP ${status}${graphCode ? `, ${graphCode}` : ""}).`,
      { status, graphCode, graphMessage, raw: text },
    );
  }

  const payload = (await response.json()) as { value?: GraphMessage[] };
  const items = payload.value ?? [];

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
  const provider = options.provider ?? "mock";
  const limit = options.limit ?? 10;

  if (provider === "mock") {
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
