/**
 * reminders.ts — MVP reminder scheduling layer
 *
 * Generates 4 in-app reminders per deadline: 7d / 3d / 1d / day-of.
 * Delivery channel: IN_APP (default) — stored in DB, polled via /api/reminders.
 * EMAIL_DIGEST channel reserved for future; processor handles it gracefully.
 */

import { prisma } from "@/lib/db";
import { logger, metrics } from "@/lib/logger";

export type ReminderOffset = "7d" | "3d" | "1d" | "day-of";

const OFFSETS: Array<{ label: ReminderOffset; daysBeforeDue: number }> = [
  { label: "7d", daysBeforeDue: 7 },
  { label: "3d", daysBeforeDue: 3 },
  { label: "1d", daysBeforeDue: 1 },
  { label: "day-of", daysBeforeDue: 0 },
];

function computeSendAt(dueAt: Date, daysBeforeDue: number): Date {
  const sendAt = new Date(dueAt);
  sendAt.setDate(sendAt.getDate() - daysBeforeDue);
  // For day-of: send at 08:00; for others: keep same time-of-day as deadline
  if (daysBeforeDue === 0) {
    sendAt.setHours(8, 0, 0, 0);
  }
  return sendAt;
}

export type ScheduleRemindersInput = {
  studentId: string;
  sourceType?: "DEADLINE" | "SCHEDULE_CHANGE";
  sourceId: string;
  title: string;
  body?: string;
  dueAt: Date;
  channel?: "IN_APP" | "EMAIL_DIGEST";
};

/**
 * Idempotently schedule all 4 reminders for a deadline.
 * Uses upsert so calling again with the same (studentId, sourceId, offsetLabel)
 * just refreshes without duplicating.
 */
export async function scheduleDeadlineReminders(input: ScheduleRemindersInput) {
  const now = new Date();
  const sourceType = input.sourceType ?? "DEADLINE";
  const channel = input.channel ?? "IN_APP";

  const ops = OFFSETS.map(({ label, daysBeforeDue }) => {
    const sendAt = computeSendAt(input.dueAt, daysBeforeDue);
    // Skip reminders that are already in the past
    if (sendAt <= now) return null;

    return prisma.reminder.upsert({
      where: {
        studentId_sourceId_offsetLabel: {
          studentId: input.studentId,
          sourceId: input.sourceId,
          offsetLabel: label,
        },
      },
      update: {
        title: input.title,
        body: input.body,
        dueAt: input.dueAt,
        sendAt,
        channel,
        status: "PENDING",
        lastError: null,
      },
      create: {
        studentId: input.studentId,
        sourceType,
        sourceId: input.sourceId,
        title: input.title,
        body: input.body,
        dueAt: input.dueAt,
        sendAt,
        offsetLabel: label,
        channel,
        status: "PENDING",
      },
    });
  });

  const results = await Promise.all(ops.filter(Boolean));
  logger.debug("reminders.scheduled", {
    studentId: input.studentId,
    sourceId: input.sourceId,
    count: results.length,
    channel,
  });
  metrics.increment("reminders.scheduled", results.length);
  return results;
}

export type SerializedReminder = {
  id: string;
  title: string;
  body?: string;
  dueAt: string;
  sendAt: string;
  offsetLabel: string;
  status: string;
  sourceType: string;
  sourceId?: string;
};

function serializeReminder(r: {
  id: string;
  title: string;
  body: string | null;
  dueAt: Date;
  sendAt: Date;
  offsetLabel: string;
  status: string;
  sourceType: string;
  sourceId: string | null;
}): SerializedReminder {
  return {
    id: r.id,
    title: r.title,
    body: r.body ?? undefined,
    dueAt: r.dueAt.toISOString(),
    sendAt: r.sendAt.toISOString(),
    offsetLabel: r.offsetLabel,
    status: r.status,
    sourceType: r.sourceType,
    sourceId: r.sourceId ?? undefined,
  };
}

/**
 * Get all pending/upcoming reminders for a student (in-app feed).
 */
export async function getStudentReminders(studentId: string, includeAll = false) {
  const where = includeAll
    ? { studentId }
    : { studentId, status: { in: ["PENDING", "SENT"] } };

  const reminders = await prisma.reminder.findMany({
    where,
    orderBy: { sendAt: "asc" },
    take: 50,
  });

  return reminders.map(serializeReminder);
}

/**
 * Mark a reminder as dismissed.
 */
export async function dismissReminder(studentId: string, reminderId: string) {
  const reminder = await prisma.reminder.findFirst({
    where: { id: reminderId, studentId },
  });
  if (!reminder) return null;

  return prisma.reminder.update({
    where: { id: reminderId },
    data: { status: "DISMISSED" },
  });
}

/**
 * Mark due reminders as SENT for a specific student.
 * Backward-compat wrapper; delegates to the processor's per-student path.
 * In production this is superseded by POST /api/reminders/process (cron endpoint).
 */
export async function markDueRemindersAsSent(studentId: string): Promise<number> {
  const { processDueRemindersForStudent } = await import("@/lib/edu-schedule/reminder-processor");
  return processDueRemindersForStudent(studentId);
}

/**
 * Scan ScheduleChanges with effectiveFrom dates and schedule reminders for them.
 * Called after email scan or when changes are detected.
 */
export async function syncRemindersFromScheduleChanges(studentId: string) {
  const changes = await prisma.scheduleChange.findMany({
    where: {
      studentId,
      effectiveFrom: { not: null, gt: new Date() },
      status: { in: ["DETECTED", "PENDING", "APPLIED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  let scheduled = 0;
  for (const change of changes) {
    if (!change.effectiveFrom) continue;
    const results = await scheduleDeadlineReminders({
      studentId,
      sourceType: "SCHEDULE_CHANGE",
      sourceId: change.id,
      title: `Reminder: ${change.title}`,
      body: change.details ?? undefined,
      dueAt: change.effectiveFrom,
    });
    scheduled += results.length;
  }

  logger.info("reminders.sync_from_changes", { studentId, changesChecked: changes.length, scheduled });
  return scheduled;
}

/**
 * Scan CalendarEvents and schedule reminders for upcoming deadlines/exams.
 * Looks for events with keywords suggesting deadlines.
 */
export async function syncRemindersFromCalendarEvents(studentId: string) {
  const deadlineKeywords = ["deadline", "due", "submission", "exam", "assignment", "quiz", "test", "midterm", "final"];
  const now = new Date();
  const future = new Date(now);
  future.setDate(future.getDate() + 30); // look 30 days ahead

  const events = await prisma.calendarEvent.findMany({
    where: {
      studentId,
      startsAt: { gt: now, lt: future },
    },
    orderBy: { startsAt: "asc" },
    take: 50,
  });

  // Filter events that look like deadlines
  const deadlineEvents = events.filter((e) => {
    const titleLower = e.title.toLowerCase();
    const descLower = (e.description ?? "").toLowerCase();
    return deadlineKeywords.some((kw) => titleLower.includes(kw) || descLower.includes(kw));
  });

  let scheduled = 0;
  for (const event of deadlineEvents) {
    const results = await scheduleDeadlineReminders({
      studentId,
      sourceType: "DEADLINE",
      sourceId: event.id,
      title: `Upcoming: ${event.title}`,
      body: event.description ?? undefined,
      dueAt: event.startsAt,
    });
    scheduled += results.length;
  }

  logger.info("reminders.sync_from_events", {
    studentId,
    eventsChecked: events.length,
    deadlineEvents: deadlineEvents.length,
    scheduled,
  });
  return { scheduled, checked: events.length, deadlineEvents: deadlineEvents.length };
}
