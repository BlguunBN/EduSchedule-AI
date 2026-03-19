import { requireCurrentStudent } from "@/lib/edu-schedule/current-student";
import {
  getStudentReminders,
  markDueRemindersAsSent,
  syncRemindersFromCalendarEvents,
  syncRemindersFromScheduleChanges,
} from "@/lib/edu-schedule/reminders";
import { RemindersPanel } from "@/components/dashboard/reminders-panel";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const { student } = await requireCurrentStudent();

  // Mark past-due reminders as sent on page load
  await markDueRemindersAsSent(student.id);

  // Auto-sync reminders from current data
  await Promise.all([
    syncRemindersFromScheduleChanges(student.id),
    syncRemindersFromCalendarEvents(student.id),
  ]);

  const reminders = await getStudentReminders(student.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">Reminders</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
          Upcoming deadlines &amp; alerts
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Auto-generated reminders 7 days, 3 days, 1 day, and day-of your deadlines and schedule changes.
        </p>
      </div>

      <RemindersPanel initialReminders={reminders} />
    </div>
  );
}
