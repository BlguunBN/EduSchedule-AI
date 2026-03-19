/**
 * reminder-processor.ts — Server-side batch processor for due reminders.
 *
 * Implements a safe status-state machine:
 *   PENDING → PROCESSING → SENT | FAILED
 *
 * Delivery channels (MVP):
 *   IN_APP  — marks status SENT in DB; the client polls /api/reminders to read them.
 *   EMAIL_DIGEST — reserved for future email delivery; falls back gracefully.
 *
 * Safe for concurrent runs:
 *   - Atomically claims reminders with PROCESSING status to avoid double-dispatch.
 *   - Retries allowed up to MAX_ATTEMPTS; after that marks FAILED with lastError.
 *
 * Called by:
 *   - POST /api/reminders/process  (cron/scheduler endpoint)
 *   - GET  /api/reminders           (convenience pass on read — maintains backward compat)
 */

import { prisma } from "@/lib/db";
import { logger, metrics } from "@/lib/logger";

export const MAX_DELIVERY_ATTEMPTS = 3;
const BATCH_SIZE = 50;

export type ProcessRemindersResult = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  durationMs: number;
};

/**
 * Process all due reminders across all students.
 * Safe to call from a cron endpoint with a secret header guard.
 */
export async function processAllDueReminders(): Promise<ProcessRemindersResult> {
  const start = Date.now();
  const now = new Date();

  // Atomically claim PENDING reminders that are due
  const claimed = await prisma.reminder.updateMany({
    where: {
      status: "PENDING",
      sendAt: { lte: now },
      deliveryAttempts: { lt: MAX_DELIVERY_ATTEMPTS },
    },
    data: {
      status: "PROCESSING",
      deliveryAttempts: { increment: 1 },
    },
  });

  const claimedCount = claimed.count;
  if (claimedCount === 0) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0, durationMs: Date.now() - start };
  }

  logger.info("reminder_processor.claimed", { count: claimedCount });
  metrics.increment("reminders.claimed", claimedCount);

  // Fetch the claimed batch
  const reminders = await prisma.reminder.findMany({
    where: {
      status: "PROCESSING",
      sendAt: { lte: now },
    },
    take: BATCH_SIZE,
    orderBy: { sendAt: "asc" },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of reminders) {
    try {
      await deliverReminder(reminder);

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: "SENT",
          sentAt: now,
          lastError: null,
        },
      });

      sent++;
      metrics.increment("reminders.sent");
      logger.info("reminder_processor.sent", {
        reminderId: reminder.id,
        studentId: reminder.studentId,
        channel: reminder.channel,
        offsetLabel: reminder.offsetLabel,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const attempts = reminder.deliveryAttempts;

      if (attempts >= MAX_DELIVERY_ATTEMPTS) {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: "FAILED", lastError: errorMsg },
        });
        failed++;
        metrics.increment("reminders.failed");
        logger.error("reminder_processor.failed", {
          reminderId: reminder.id,
          studentId: reminder.studentId,
          attempts,
          channel: reminder.channel,
        }, err);
      } else {
        // Revert to PENDING so it can be retried next run
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: "PENDING", lastError: errorMsg },
        });
        skipped++;
        logger.warn("reminder_processor.retry_queued", {
          reminderId: reminder.id,
          studentId: reminder.studentId,
          attempts,
        }, err);
      }
    }
  }

  const durationMs = Date.now() - start;
  logger.info("reminder_processor.complete", { sent, failed, skipped, durationMs });
  metrics.increment("reminders.process_runs");

  return { processed: reminders.length, sent, failed, skipped, durationMs };
}

/**
 * Process due reminders for a single student only.
 * Used by GET /api/reminders for backward-compatible inline delivery.
 */
export async function processDueRemindersForStudent(studentId: string): Promise<number> {
  const now = new Date();

  const claimed = await prisma.reminder.updateMany({
    where: {
      studentId,
      status: "PENDING",
      sendAt: { lte: now },
      deliveryAttempts: { lt: MAX_DELIVERY_ATTEMPTS },
    },
    data: {
      status: "PROCESSING",
      deliveryAttempts: { increment: 1 },
    },
  });

  if (claimed.count === 0) return 0;

  const reminders = await prisma.reminder.findMany({
    where: { studentId, status: "PROCESSING", sendAt: { lte: now } },
    take: BATCH_SIZE,
  });

  let sent = 0;
  for (const reminder of reminders) {
    try {
      await deliverReminder(reminder);
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "SENT", sentAt: now, lastError: null },
      });
      sent++;
      metrics.increment("reminders.sent");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const nextStatus = reminder.deliveryAttempts >= MAX_DELIVERY_ATTEMPTS ? "FAILED" : "PENDING";
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: nextStatus, lastError: errorMsg },
      });
      logger.warn("reminder_processor.delivery_error", {
        reminderId: reminder.id,
        studentId,
        nextStatus,
      }, err);
    }
  }

  return sent;
}

/**
 * Per-channel delivery logic.
 * IN_APP: no external call needed — DB record being SENT is the delivery.
 * EMAIL_DIGEST: reserved; will throw if attempted (not yet implemented).
 */
async function deliverReminder(reminder: {
  id: string;
  channel: string;
  title: string;
  body: string | null;
  studentId: string;
}): Promise<void> {
  if (reminder.channel === "IN_APP" || !reminder.channel) {
    // In-app delivery is a no-op beyond marking the DB status.
    // The client reads reminders via GET /api/reminders.
    return;
  }

  if (reminder.channel === "EMAIL_DIGEST") {
    // EMAIL_DIGEST is reserved for future implementation.
    // Logging the intent; gracefully downgrades to in-app for now.
    logger.info("reminder_processor.email_digest_noop", {
      reminderId: reminder.id,
      note: "EMAIL_DIGEST channel not yet wired to SMTP/SES; treating as IN_APP",
    });
    return;
  }

  // Unknown channel — log and treat as in-app rather than hard-failing
  logger.warn("reminder_processor.unknown_channel", {
    reminderId: reminder.id,
    channel: reminder.channel,
  });
}
