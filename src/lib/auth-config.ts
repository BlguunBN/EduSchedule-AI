const PLACEHOLDER_VALUES = new Set([
  "",
  "your-microsoft-client-id",
  "your-microsoft-client-secret",
  "placeholder-client-id",
  "placeholder-client-secret",
]);

function readEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

export function getMicrosoftAuthConfigStatus() {
  const clientId = readEnv("AUTH_MICROSOFT_CLIENT_ID");
  const clientSecret = readEnv("AUTH_MICROSOFT_CLIENT_SECRET");
  const tenantId = readEnv("AUTH_MICROSOFT_TENANT_ID") || "common";

  const missing = [
    ["AUTH_MICROSOFT_CLIENT_ID", clientId],
    ["AUTH_MICROSOFT_CLIENT_SECRET", clientSecret],
  ]
    .filter(([, value]) => !value || PLACEHOLDER_VALUES.has(value))
    .map(([key]) => key);

  return {
    clientId,
    clientSecret,
    tenantId,
    configured: missing.length === 0,
    missing,
  };
}

export function isMicrosoftAuthConfigured() {
  return getMicrosoftAuthConfigStatus().configured;
}

export function isDevAuthBypassPublicEnabled() {
  return process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true";
}
