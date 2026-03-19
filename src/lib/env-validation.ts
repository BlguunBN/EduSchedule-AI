/**
 * env-validation.ts — Production environment guardrails
 *
 * Call `validateProductionEnv()` at startup (e.g. in instrumentation.ts or a
 * server component root) to catch missing/placeholder config before the first
 * request hits the system.
 *
 * `checkEnvWarnings()` returns non-fatal warnings (logged but not thrown).
 */

const PLACEHOLDER_VALUES = new Set([
  "",
  "replace-with-a-long-random-string",
  "your-microsoft-client-id",
  "your-microsoft-client-secret",
  "placeholder-client-id",
  "placeholder-client-secret",
  "sk-proj-...",
]);

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (PLACEHOLDER_VALUES.has(trimmed)) return true;
  // Detect values that look like they came from .env.example verbatim
  if (trimmed.startsWith("your-") || trimmed.startsWith("replace-")) return true;
  return false;
}

export interface EnvCheckResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Returns the full validation result without throwing.
 * Safe to call from any context.
 */
export function checkEnv(): EnvCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProd = process.env.NODE_ENV === "production";

  // --- Required in ALL environments ---
  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is not set. Prisma cannot connect to the database.");
  }

  if (isPlaceholder(process.env.AUTH_SECRET)) {
    errors.push(
      "AUTH_SECRET is missing or is a placeholder value. " +
        "Generate one with: openssl rand -hex 32",
    );
  }

  // --- Production-only requirements ---
  if (isProd) {
    if (isPlaceholder(process.env.AUTH_MICROSOFT_CLIENT_ID)) {
      errors.push(
        "AUTH_MICROSOFT_CLIENT_ID is missing or placeholder. " +
          "Microsoft Entra ID authentication will not work.",
      );
    }

    if (isPlaceholder(process.env.AUTH_MICROSOFT_CLIENT_SECRET)) {
      errors.push(
        "AUTH_MICROSOFT_CLIENT_SECRET is missing or placeholder. " +
          "Microsoft Entra ID authentication will not work.",
      );
    }

    if (isPlaceholder(process.env.AGENT_API_KEY)) {
      errors.push(
        "AGENT_API_KEY is missing or placeholder. " +
          "AI chat and email-scan features will be unavailable.",
      );
    }

    // Safety: these must be off in production
    if (process.env.DEV_AUTH_BYPASS === "true") {
      errors.push(
        "DEV_AUTH_BYPASS=true is set in a production environment. " +
          "This is a critical security risk — remove it immediately.",
      );
    }
    if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true") {
      errors.push(
        "NEXT_PUBLIC_DEV_AUTH_BYPASS=true is set in a production environment. " +
          "This is a critical security risk — remove it immediately.",
      );
    }
  }

  // --- Non-fatal warnings for all environments ---
  if (!process.env.AUTH_MICROSOFT_TENANT_ID) {
    warnings.push(
      "AUTH_MICROSOFT_TENANT_ID is not set. Defaulting to 'common' (all Microsoft accounts). " +
        "For a school deployment, set this to your university's tenant ID.",
    );
  }

  if (!isProd && process.env.DEV_AUTH_BYPASS !== "true") {
    if (isPlaceholder(process.env.AUTH_MICROSOFT_CLIENT_ID)) {
      warnings.push(
        "AUTH_MICROSOFT_CLIENT_ID is not configured. " +
          "Microsoft sign-in will not work. Set DEV_AUTH_BYPASS=true to use the demo mode locally.",
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Validates the environment and throws if critical variables are missing/wrong.
 * Call this early in production startup (instrumentation.ts or similar).
 */
export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const result = checkEnv();

  // Always log warnings
  for (const w of result.warnings) {
    console.warn(`[EduScheduleAI][ENV WARN] ${w}`);
  }

  if (!result.ok) {
    for (const e of result.errors) {
      console.error(`[EduScheduleAI][ENV ERROR] ${e}`);
    }
    throw new Error(
      `Production startup aborted: ${result.errors.length} environment configuration error(s). ` +
        "Check server logs for details.",
    );
  }
}

/**
 * Logs env warnings to the console without throwing.
 * Safe to call in development or from instrumentation.ts.
 */
export function logEnvStatus(): void {
  const result = checkEnv();
  for (const w of result.warnings) {
    console.warn(`[EduScheduleAI][ENV WARN] ${w}`);
  }
  for (const e of result.errors) {
    console.error(`[EduScheduleAI][ENV ERROR] ${e}`);
  }
  if (result.ok) {
    console.info("[EduScheduleAI][ENV] All required environment variables are set.");
  }
}
