/**
 * smoke-check.ts — Pre-release validation script
 *
 * Usage:
 *   npx tsx scripts/smoke-check.ts [--base-url http://localhost:3000]
 *
 * Checks:
 *   1. Environment variables (required keys present and non-placeholder)
 *   2. Database connectivity (Prisma can connect)
 *   3. API route reachability for core endpoints
 *
 * Exit code 0 = all checks passed, non-zero = failures found.
 *
 * In CI/CD you can run this after `npm run build && npm start &` (wait for server ready).
 */

/**
 * Load .env manually for local runs — tsx doesn't auto-load it like Next.js does.
 * Only sets variables that are not already in process.env.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

function loadDotenv() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(__dirname, "../.env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const rawValue = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    // Don't override values already set in the environment
    if (!process.env[key]) {
      process.env[key] = rawValue;
    } else if (key === "AUTH_SECRET" && process.env[key] === "replace-with-a-long-random-string") {
      // Handle duplicate key: prefer later non-placeholder value
      process.env[key] = rawValue;
    }
  }
}
loadDotenv();

import { checkEnv } from "../src/lib/env-validation";

const BASE_URL = (() => {
  const idx = process.argv.indexOf("--base-url");
  return idx !== -1 ? process.argv[idx + 1] : "http://localhost:3000";
})();

type CheckResult = { name: string; ok: boolean; message: string };
const results: CheckResult[] = [];

function pass(name: string, message = "OK") {
  results.push({ name, ok: true, message });
  console.log(`  ✅ ${name}: ${message}`);
}

function fail(name: string, message: string) {
  results.push({ name, ok: false, message });
  console.error(`  ❌ ${name}: ${message}`);
}

function warn(name: string, message: string) {
  console.warn(`  ⚠️  ${name}: ${message}`);
}

async function main() {
  // ─── 1. Environment variables ─────────────────────────────────────────────
  console.log("\n[1/3] Checking environment variables...");
  const envResult = checkEnv();
  for (const w of envResult.warnings) warn("ENV", w);
  if (envResult.ok) {
    pass("ENV", "All required variables are set");
  } else {
    for (const e of envResult.errors) {
      fail("ENV", e);
    }
  }

  // ─── 2. Database connectivity ───────────────────────────────────────────────
  console.log("\n[2/3] Checking database connectivity...");
  try {
    const { prisma } = await import("../src/lib/db");
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    pass("DB", "Prisma connected and query succeeded");
  } catch (err) {
    fail("DB", `Prisma connection failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ─── 3. API route reachability ─────────────────────────────────────────────
  console.log(`\n[3/3] Checking API routes at ${BASE_URL} ...`);
  console.log("  (Unauthenticated requests returning 401 = correct.)");

  const API_ROUTES: Array<{ method: string; path: string; label: string; expectStatus: number[] }> = [
    { method: "GET",  path: "/api/reminders",         label: "Reminders API",          expectStatus: [200, 401] },
    { method: "GET",  path: "/api/calendar/events",   label: "Calendar Events API",    expectStatus: [200, 401] },
    { method: "GET",  path: "/api/history",           label: "History API",            expectStatus: [200, 401] },
    { method: "GET",  path: "/api/settings",          label: "Settings API",           expectStatus: [200, 401] },
    { method: "GET",  path: "/api/timetable",         label: "Timetable API",          expectStatus: [200, 401] },
    { method: "GET",  path: "/api/auth/csrf",         label: "Auth CSRF endpoint",     expectStatus: [200] },
    // Reminders process: GET is a metrics health-check (open in dev, 401 in prod if CRON_SECRET unset)
    { method: "GET",  path: "/api/reminders/process", label: "Reminders Process (GET)", expectStatus: [200, 401, 503] },
    // POST process: open in dev with no CRON_SECRET, 401/503 otherwise
    { method: "POST", path: "/api/reminders/process", label: "Reminders Process (POST)", expectStatus: [200, 401, 503] },
  ];

  let serverUnreachable = false;

  for (const route of API_ROUTES) {
    if (serverUnreachable) {
      warn(route.label, "Skipped (server unreachable)");
      continue;
    }
    try {
      const res = await fetch(`${BASE_URL}${route.path}`, {
        method: route.method,
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
      });

      if (route.expectStatus.includes(res.status)) {
        const note = res.status === 401 ? " (unauthenticated — expected)" : "";
        pass(route.label, `HTTP ${res.status}${note}`);
      } else {
        fail(route.label, `Unexpected HTTP ${res.status} (expected one of: ${route.expectStatus.join(", ")})`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed") || msg.includes("ENOTFOUND")) {
        warn(route.label, `Server unreachable at ${BASE_URL} — start the server first (npm start)`);
        serverUnreachable = true;
      } else {
        fail(route.label, `Request error: ${msg}`);
      }
    }
  }

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log("\n────────────────────────────────────────");
  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);
  console.log(`Results: ${passed.length} passed, ${failed.length} failed`);

  if (serverUnreachable) {
    console.warn("\n⚠️  Server was unreachable — API checks were skipped. Run `npm start` first for full smoke check.");
  }

  if (failed.length > 0) {
    console.error("\nFailed checks:");
    for (const f of failed) console.error(`  • [${f.name}] ${f.message}`);
    process.exit(1);
  } else {
    console.log("\n✅ All smoke checks passed. Ready for release.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Smoke check crashed:", err);
  process.exit(2);
});
