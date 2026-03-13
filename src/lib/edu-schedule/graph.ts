import { prisma } from "@/lib/db";

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
  "common",
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
