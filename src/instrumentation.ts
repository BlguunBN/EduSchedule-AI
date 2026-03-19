/**
 * instrumentation.ts — Next.js server startup hook
 *
 * Runs once when the server process starts (before any requests).
 * In production it throws on missing env; in dev it only logs warnings.
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateProductionEnv, logEnvStatus } = await import("./lib/env-validation");
    if (process.env.NODE_ENV === "production") {
      validateProductionEnv();
    } else {
      logEnvStatus();
    }
  }
}
