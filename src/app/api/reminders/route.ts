import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { requireCurrentStudent } from "@/lib/edu-schedule/current-student";
import {
  getStudentReminders,
  markDueRemindersAsSent,
  syncRemindersFromCalendarEvents,
  syncRemindersFromScheduleChanges,
} from "@/lib/edu-schedule/reminders";

/**
 * GET /api/reminders
 * Returns the in-app reminder feed for the current student.
 * Also marks any past-due PENDING reminders as SENT (simulated delivery).
 * Query params:
 *   ?all=true  — include DISMISSED reminders too
 *   ?sync=true — trigger a sync from calendar/schedule-changes before returning
 */
export async function GET(req: NextRequest) {
  try {
    const { student } = await requireCurrentStudent();
    const includeAll = req.nextUrl.searchParams.get("all") === "true";
    const doSync = req.nextUrl.searchParams.get("sync") === "true";

    // Mark past-due pending reminders as delivered
    const markedSent = await markDueRemindersAsSent(student.id);

    let syncStats: object | null = null;
    if (doSync) {
      const [fromChanges, fromEvents] = await Promise.all([
        syncRemindersFromScheduleChanges(student.id),
        syncRemindersFromCalendarEvents(student.id),
      ]);
      syncStats = { scheduledFromChanges: fromChanges, ...fromEvents };
    }

    const reminders = await getStudentReminders(student.id, includeAll);

    return jsonOk({
      reminders,
      count: reminders.length,
      markedSent,
      ...(syncStats ? { sync: syncStats } : {}),
    });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * POST /api/reminders/sync
 * Explicitly trigger a reminder sync from detected deadlines/events.
 */
export async function POST(req: NextRequest) {
  try {
    const { student } = await requireCurrentStudent();
    const body = await req.json().catch(() => ({}));
    const source = (body as { source?: string }).source ?? "all";

    let fromChanges = 0;
    let fromEventsStats = { scheduled: 0, checked: 0, deadlineEvents: 0 };

    if (source === "all" || source === "schedule_changes") {
      fromChanges = await syncRemindersFromScheduleChanges(student.id);
    }
    if (source === "all" || source === "calendar") {
      fromEventsStats = await syncRemindersFromCalendarEvents(student.id);
    }

    const reminders = await getStudentReminders(student.id);

    return jsonOk({
      synced: true,
      scheduledFromChanges: fromChanges,
      ...fromEventsStats,
      reminders,
      count: reminders.length,
    });
  } catch (error) {
    return jsonError(error);
  }
}
