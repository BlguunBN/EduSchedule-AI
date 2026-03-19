/**
 * graph.ts — Microsoft Graph integration status + runtime helpers.
 *
 * Phase B additions:
 *   - graphFetchWithRetry(): retry-safe wrapper with exponential backoff
 *   - classifyGraphError(): actionable error codes for all known Graph failure modes
 *   - No silent fallback in production; errors surface with clear codes/messages
 */

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { logger, metrics } from "@/lib/logger";

const MICROSOFT_PROVIDER = "microsoft-entra-id";

const REQUIRED_ENV_KEYS = [
  "AUTH_MICROSOFT_CLIENT_ID",
  "AUTH_MICROSOFT_CLIENT_SECRET",
  "AUTH_MICROSOFT_TENANT_ID",
] as const;

const PLACEHOLDER_VALUES = new Set([
  "",
  "placeholder-client-id",
  "placeholder-client-secret",
  "your-microsoft-client-id",
  "your-microsoft-client-secret",
]);

export type MicrosoftGraphStatus = {
  provider: "MICROSOFT_GRAPH";
  state: "NOT_CONFIGURED" | "READY_TO_CONNECT" | "CONNECTED";
  ready: boolean;
  connected: boolean;
  mode: "mock-only" | "ready" | "connected";
  missingEnv: string[];
  configuredEnv: string[];
  connectedAccountCount: number;
  message: string;
};

function readEnv(key: (typeof REQUIRED_ENV_KEYS)[number]) {
  return process.env[key]?.trim() ?? "";
}

export async function getMicrosoftGraphStatus(userId?: string | null): Promise<MicrosoftGraphStatus> {
  const missingEnv = REQUIRED_ENV_KEYS.filter((key) => {
    const value = readEnv(key);
    return !value || PLACEHOLDER_VALUES.has(value);
  });

  const configuredEnv = REQUIRED_ENV_KEYS.filter((key) => !missingEnv.includes(key));
  const ready = missingEnv.length === 0;

  let connectedAccountCount = 0;
  if (ready && userId) {
    connectedAccountCount = await prisma.account.count({
      where: {
        userId,
        provider: MICROSOFT_PROVIDER,
      },
    });
  }

  const connected = ready && connectedAccountCount > 0;

  if (!ready) {
    return {
      provider: "MICROSOFT_GRAPH",
      state: "NOT_CONFIGURED",
      ready: false,
      connected: false,
      mode: "mock-only",
      missingEnv,
      configuredEnv,
      connectedAccountCount,
      message:
        "Microsoft Graph is not configured in this local demo, so inbox sync stays in mock mode until the required environment variables are set.",
    };
  }

  if (!connected) {
    return {
      provider: "MICROSOFT_GRAPH",
      state: "READY_TO_CONNECT",
      ready: true,
      connected: false,
      mode: "ready",
      missingEnv,
      configuredEnv,
      connectedAccountCount,
      message:
        "Microsoft Graph credentials are configured, but no Microsoft account is linked to this demo user yet. The app remains local-first until a connection exists.",
    };
  }

  return {
    provider: "MICROSOFT_GRAPH",
    state: "CONNECTED",
    ready: true,
    connected: true,
    mode: "connected",
    missingEnv,
    configuredEnv,
    connectedAccountCount,
    message:
      "Microsoft Graph credentials and a linked account are present. Live sync plumbing is ready for future expansion, but the local demo still uses explicit review before changes apply.",
  };
}

export function assertMicrosoftGraphReady(status: MicrosoftGraphStatus) {
  if (!status.ready) {
    throw new Error(status.message);
  }
}

// ─── Graph Error Classification ──────────────────────────────────────────────

export type GraphErrorInfo = {
  code: string;
  message: string;
  httpStatus: number;
  graphCode: string;
  graphMessage: string;
  retryable: boolean;
};

/**
 * Classify a raw Graph API response into a structured, actionable error.
 * Never returns a silent/generic failure in production.
 */
export function classifyGraphError(
  httpStatus: number,
  rawBody: string,
  context = "Graph API",
): GraphErrorInfo {
  let graphCode = "";
  let graphMessage = "";

  try {
    const parsed = JSON.parse(rawBody) as { error?: { code?: string; message?: string } };
    graphCode = parsed.error?.code ?? "";
    graphMessage = parsed.error?.message ?? "";
  } catch {
    // Raw text response — keep empty graphCode
  }

  // 401 — token expired / invalid
  if (httpStatus === 401) {
    return {
      code: "GRAPH_TOKEN_EXPIRED",
      message:
        "Microsoft session expired or token revoked. Sign out and sign in again to refresh access.",
      httpStatus,
      graphCode,
      graphMessage,
      retryable: false,
    };
  }

  // 403 — permission/consent issues
  if (httpStatus === 403) {
    if (graphCode === "Authorization_RequestDenied" || graphCode === "AccessDenied") {
      return {
        code: "GRAPH_PERMISSION_DENIED",
        message:
          "Microsoft Graph denied access. Ensure the application has Mail.Read (or Calendar.Read) permissions and the user has granted admin consent.",
        httpStatus,
        graphCode,
        graphMessage,
        retryable: false,
      };
    }
    return {
      code: "GRAPH_FORBIDDEN",
      message:
        `${context}: Forbidden (HTTP 403${graphCode ? `, ${graphCode}` : ""}). Check app permissions and tenant consent.`,
      httpStatus,
      graphCode,
      graphMessage,
      retryable: false,
    };
  }

  // 429 — throttled
  if (httpStatus === 429) {
    return {
      code: "GRAPH_THROTTLED",
      message:
        "Microsoft Graph is throttling requests. The request will be retried automatically with backoff.",
      httpStatus,
      graphCode,
      graphMessage,
      retryable: true,
    };
  }

  // Specific Graph error codes
  if (graphCode === "MailboxNotEnabledForRESTAPI") {
    return {
      code: "GRAPH_MAILBOX_UNAVAILABLE",
      message:
        "This Microsoft mailbox is not enabled for Graph mail API access. Use a personal Microsoft account for testing, or ask your school IT admin to enable Exchange Online mailbox REST/Graph access.",
      httpStatus,
      graphCode,
      graphMessage,
      retryable: false,
    };
  }

  if (graphCode === "InvalidAuthenticationToken") {
    return {
      code: "GRAPH_TOKEN_INVALID",
      message:
        "The Microsoft authentication token is invalid or malformed. Please sign out and sign in again.",
      httpStatus,
      graphCode,
      graphMessage,
      retryable: false,
    };
  }

  if (graphCode === "AuthenticationError") {
    return {
      code: "GRAPH_AUTH_ERROR",
      message:
        "Microsoft authentication failed. Check that AUTH_MICROSOFT_CLIENT_ID, AUTH_MICROSOFT_CLIENT_SECRET, and AUTH_MICROSOFT_TENANT_ID are correctly configured.",
      httpStatus,
      graphCode,
      graphMessage,
      retryable: false,
    };
  }

  // 5xx — server-side Graph errors (retryable)
  if (httpStatus >= 500) {
    return {
      code: "GRAPH_SERVER_ERROR",
      message:
        `Microsoft Graph returned a server error (HTTP ${httpStatus}${graphCode ? `, ${graphCode}` : ""}). This is usually transient.`,
      httpStatus,
      graphCode,
      graphMessage,
      retryable: true,
    };
  }

  // Fallback — never silent
  return {
    code: "GRAPH_FETCH_FAILED",
    message:
      `${context} request failed (HTTP ${httpStatus}${graphCode ? `, ${graphCode}` : ""}). Check app registration, permissions, and token validity.`,
    httpStatus,
    graphCode,
    graphMessage,
    retryable: httpStatus >= 500,
  };
}

// ─── Retry-Safe Fetch Wrapper ─────────────────────────────────────────────────

type RetryOptions = {
  maxAttempts?: number;
  /** Base delay in ms for exponential backoff */
  baseDelayMs?: number;
  context?: string;
};

/**
 * Fetch wrapper that retries on transient Graph errors (429, 5xx) with
 * exponential backoff. Non-retryable errors surface immediately with
 * actionable ApiError codes.
 */
export async function graphFetchWithRetry(
  url: string,
  init: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const context = options.context ?? "Microsoft Graph";

  let lastError: ApiError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url, init);

    if (response.ok) {
      if (attempt > 1) {
        logger.info("graph.retry_succeeded", { url, attempt, context });
        metrics.increment("graph.retry_success");
      }
      return response;
    }

    const rawBody = await response.text();
    const classified = classifyGraphError(response.status, rawBody, context);

    logger.warn("graph.request_failed", {
      url,
      attempt,
      httpStatus: classified.httpStatus,
      code: classified.code,
      graphCode: classified.graphCode,
      retryable: classified.retryable,
      context,
    });
    metrics.increment(`graph.error.${classified.code}`);

    lastError = new ApiError(
      classified.httpStatus,
      classified.code,
      classified.message,
      { graphCode: classified.graphCode, graphMessage: classified.graphMessage },
    );

    if (!classified.retryable || attempt === maxAttempts) {
      break;
    }

    // Exponential backoff: 500ms, 1000ms, 2000ms…
    const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
    logger.info("graph.retry_backoff", { attempt, nextAttemptIn: delayMs, context });
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw lastError!;
}
