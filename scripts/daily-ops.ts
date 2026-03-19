/**
 * daily-ops.ts — Beta daily operations health check
 *
 * Runs in under 2 minutes. Checks:
 *   1. Environment variables (required keys present)
 *   2. Database connectivity + stuck/failed reminder counts
 *   3. Auth endpoint liveness
 *   4. Reminder processor metrics snapshot
 *
 * Usage:
 *   npx tsx scripts/daily-ops.ts [--base-url http://localhost:3000]
 *
 * Or via npm:
 *   npm run ops:daily
 *
 * Exit codes:
 *   0 = all clear
 *   1 = one or more checks need attention
 *   2 = script crashed
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
    const rawValue = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = rawValue;
  }
}
loadDotenv();

import { checkEnv } from "../src/lib/env-validation";

const BASE_URL = (() => {
  const idx = process.argv.indexOf("--base-url");
  return idx !== -1 ? process.argv[idx + 1] : "http://localhost:3000";
})();

// ─── Thresholds ────────────────────────────────────────────────────────────────
const THRESHOLDS = {
  /** Reminders stuck in PENDING older than this many minutes → WARN */
  PENDING_STUCK_MINUTES: 30,
  /** Reminders stuck in PENDING older than this many minutes → ACTION NEEDED */
  PENDING_STUCK_CRITICAL_MINUTES: 120,
  /** Consecutive failures on one reminder → WARN */
  FAILED_REMINDER_WARN: 1,
  /** High graph error count in metrics → WARN */
  GRAPH_ERROR_WARN: 5,
};

type Status = "OK" | "WARN" | "ACTION" | "SKIP";
type CheckResult = { name: string; status: Status; message: string; detail?: string };

async function main() {
  const results: CheckResult[] = [];

  function log(status: Status, name: string, message: string, detail?: string) {
    const icon = { OK: "✅", WARN: "⚠️ ", ACTION: "❌", SKIP: "⏭️ " }[status];
    console.log(`  ${icon} ${name}: ${message}`);
    if (detail) console.log(`      → ${detail}`);
    results.push({ name, status, message, detail });
  }

  // ─── 1. Environment ──────────────────────────────────────────────────────────
  console.log("\n[1/4] Environment variables...");
  const envResult = checkEnv();
  if (envResult.ok) {
    log("OK", "ENV", "All required variables present");
  } else {
    for (const e of envResult.errors) {
      log("ACTION", "ENV", e, "Fix before opening the app to users");
    }
  }
  for (const w of envResult.warnings) {
    log("WARN", "ENV", w);
  }

  // ─── 2. Database + reminder health ──────────────────────────────────────────
  console.log("\n[2/4] Database + reminder state...");
  try {
    const { prisma } = await import("../src/lib/db");
    await prisma.$queryRaw`SELECT 1`;
    log("OK", "DB", "Prisma connected");

    const now = new Date();
    const stuckThreshold = new Date(now.getTime() - THRESHOLDS.PENDING_STUCK_MINUTES * 60 * 1000);
    const criticalThreshold = new Date(
      now.getTime() - THRESHOLDS.PENDING_STUCK_CRITICAL_MINUTES * 60 * 1000,
    );

    // Stuck PENDING reminders
    const stuckCount = await prisma.reminder.count({
      where: { status: "PENDING", sendAt: { lt: stuckThreshold } },
    });
    const criticalCount = await prisma.reminder.count({
      where: { status: "PENDING", sendAt: { lt: criticalThreshold } },
    });
    if (criticalCount > 0) {
      log(
        "ACTION",
        "Stuck Reminders",
        `${criticalCount} reminders overdue by >2h`,
        `Run: curl -X POST ${BASE_URL}/api/reminders/process -H "Authorization: Bearer $CRON_SECRET"`,
      );
    } else if (stuckCount > 0) {
      log(
        "WARN",
        "Stuck Reminders",
        `${stuckCount} reminders overdue by >${THRESHOLDS.PENDING_STUCK_MINUTES}min`,
        "Trigger processor or check if cron is running",
      );
    } else {
      log("OK", "Stuck Reminders", "No overdue PENDING reminders");
    }

    // Failed reminders
    const failedCount = await prisma.reminder.count({ where: { status: "FAILED" } });
    if (failedCount >= THRESHOLDS.FAILED_REMINDER_WARN) {
      log(
        "WARN",
        "Failed Reminders",
        `${failedCount} reminder(s) in FAILED state`,
        "Check INCIDENT_RESPONSE_PLAYBOOK.md → Scenario 1 for remediation",
      );
    } else {
      log("OK", "Failed Reminders", "No failed reminders");
    }

    // Processing reminders (zombie check — shouldn't stay PROCESSING > 5 min)
    const processingThreshold = new Date(now.getTime() - 5 * 60 * 1000);
    const zombieCount = await prisma.reminder.count({
      where: { status: "PROCESSING", updatedAt: { lt: processingThreshold } },
    });
    if (zombieCount > 0) {
      log(
        "ACTION",
        "Zombie Reminders",
        `${zombieCount} reminders stuck in PROCESSING >5min`,
        "App may have crashed mid-batch. Check server logs and run: npx prisma studio",
      );
    } else {
      log("OK", "Zombie Reminders", "No stuck PROCESSING reminders");
    }

    await prisma.$disconnect();
  } catch (err) {
    log(
      "ACTION",
      "DB",
      `Connection failed: ${err instanceof Error ? err.message : String(err)}`,
      "Check DATABASE_URL env var and that the DB file/server is accessible",
    );
  }

  // ─── 3. Auth endpoint liveness ───────────────────────────────────────────────
  console.log(`\n[3/4] API liveness at ${BASE_URL}...`);
  let serverUp = false;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/csrf`, { signal: AbortSignal.timeout(6000) });
    if (res.status === 200) {
      log("OK", "Auth (CSRF)", `HTTP 200 — app is up`);
      serverUp = true;
    } else {
      log("WARN", "Auth (CSRF)", `Unexpected HTTP ${res.status}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
      log("SKIP", "Auth (CSRF)", `Server not reachable at ${BASE_URL}`, "Start server: npm start");
    } else {
      log("WARN", "Auth (CSRF)", `Request error: ${msg}`);
    }
  }

  // ─── 4. Reminder processor metrics ──────────────────────────────────────────
  console.log("\n[4/4] Reminder processor metrics...");
  if (!serverUp) {
    log("SKIP", "Processor Metrics", "Server offline — skipped");
  } else {
    try {
      const cronSecret = process.env.CRON_SECRET?.trim();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (cronSecret) headers["Authorization"] = `Bearer ${cronSecret}`;

      const res = await fetch(`${BASE_URL}/api/reminders/process`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(6000),
      });

      if (res.status === 200) {
        const body = (await res.json()) as { data?: { metrics?: Record<string, number> } };
        const snap = body?.data?.metrics ?? {};
        const graphErrors = Object.entries(snap)
          .filter(([k]) => k.startsWith("graph.error.") || k.startsWith("error."))
          .map(([k, v]) => `${k}=${v}`);

        const totalGraphErrors = Object.entries(snap)
          .filter(([k]) => k.startsWith("graph.error.") || k.startsWith("error."))
          .reduce((sum, [, v]) => sum + (v as number), 0);

        if (totalGraphErrors >= THRESHOLDS.GRAPH_ERROR_WARN) {
          log(
            "WARN",
            "Processor Metrics",
            `${totalGraphErrors} graph/processing errors in current session`,
            graphErrors.join(", "),
          );
        } else if (totalGraphErrors > 0) {
          log(
            "OK",
            "Processor Metrics",
            `Metrics OK (${totalGraphErrors} minor errors)`,
            graphErrors.join(", "),
          );
        } else {
          const processed = snap["cron.reminders.process"] ?? 0;
          log("OK", "Processor Metrics", `Clean — processor ran ${processed} time(s) this session`);
        }
      } else if (res.status === 401) {
        log("WARN", "Processor Metrics", "HTTP 401 — set CRON_SECRET env var to read metrics");
      } else {
        log("WARN", "Processor Metrics", `Unexpected HTTP ${res.status}`);
      }
    } catch (err) {
      log(
        "WARN",
        "Processor Metrics",
        `Request error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════════");
  const actions = results.filter((r) => r.status === "ACTION");
  const warns = results.filter((r) => r.status === "WARN");
  const oks = results.filter((r) => r.status === "OK");
  console.log(`Results: ${oks.length} OK  |  ${warns.length} WARN  |  ${actions.length} ACTION`);

  if (actions.length > 0) {
    console.log("\n🚨 Action needed:");
    for (const r of actions) {
      console.log(`  • [${r.name}] ${r.message}`);
      if (r.detail) console.log(`    → ${r.detail}`);
    }
  }
  if (warns.length > 0) {
    console.log("\n⚠️  Warnings (investigate when time allows):");
    for (const r of warns) {
      console.log(`  • [${r.name}] ${r.message}`);
      if (r.detail) console.log(`    → ${r.detail}`);
    }
  }

  if (actions.length === 0 && warns.length === 0) {
    console.log("\n✅ All systems healthy. Daily ops check complete.");
  } else if (actions.length === 0) {
    console.log("\n✅ No actions required. Review warnings above when time allows.");
  } else {
    console.log("\n❌ Action(s) required — see above.");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Daily ops check crashed:", err);
  process.exitCode = 2;
});
