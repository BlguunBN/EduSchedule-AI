/**
 * POST /api/reminders/process
 *
 * Cron-compatible endpoint to batch-process all due reminders.
 * Guard: requires `Authorization: Bearer <CRON_SECRET>` header,
 * OR runs unrestricted in development mode.
 *
 * Intended call patterns:
 *   - Vercel Cron:    `{"schedule": "* * * * *"}` in vercel.json pointing here
 *   - GitHub Actions: scheduled workflow calling this with a secret
 *   - External cron:  `curl -X POST https://…/api/reminders/process -H "Authorization: Bearer $CRON_SECRET"`
 *
 * Response:
 *   { processed, sent, failed, skipped, durationMs }
 */

import { NextRequest } from "next/server";
import { jsonError, jsonOk, ApiError } from "@/lib/api";
import { processAllDueReminders } from "@/lib/edu-schedule/reminder-processor";
import { logger, metrics } from "@/lib/logger";

const IS_DEV = process.env.NODE_ENV !== "production";

function verifyCronSecret(req: NextRequest): void {
  const cronSecret = process.env.CRON_SECRET?.trim();

  // In dev without CRON_SECRET set: allow unrestricted (local testing)
  if (IS_DEV && !cronSecret) return;

  if (!cronSecret) {
    throw new ApiError(
      503,
      "CRON_SECRET_NOT_SET",
      "CRON_SECRET environment variable is not configured. Set it to enable scheduled reminder processing.",
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (token !== cronSecret) {
    throw new ApiError(401, "CRON_UNAUTHORIZED", "Invalid or missing cron secret.");
  }
}

export async function POST(req: NextRequest) {
  try {
    verifyCronSecret(req);

    logger.info("reminders.process.start");
    metrics.increment("cron.reminders.process");

    const result = await processAllDueReminders();

    logger.info("reminders.process.done", { ...result });

    return jsonOk(result);
  } catch (error) {
    logger.error("reminders.process.error", {}, error);
    return jsonError(error);
  }
}

/**
 * GET /api/reminders/process
 * Health-check: returns processor metrics snapshot.
 * No auth required — read-only, no sensitive data.
 */
export async function GET(_req: NextRequest) {
  try {
    verifyCronSecret(_req);
    const snapshot = metrics.snapshot();
    return jsonOk({ metrics: snapshot });
  } catch (error) {
    return jsonError(error);
  }
}
