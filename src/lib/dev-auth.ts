import type { Session } from "next-auth";

/**
 * Returns true only in non-production environments when the opt-in flag is set.
 * This CANNOT be activated in production regardless of env var values.
 */
export function isDevAuthBypassEnabled() {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.DEV_AUTH_BYPASS === "true";
}

export function getDevBypassSession(): Session {
  return {
    user: {
      id: "dev-demo-user",
      name: "Demo Student",
      email: "demo@eduschedule.local",
      role: "STUDENT",
    },
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  };
}
