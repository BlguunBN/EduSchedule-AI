import type { Session } from "next-auth";

export function isDevAuthBypassEnabled() {
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
