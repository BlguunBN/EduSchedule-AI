import { CalendarView } from "@/components/calendar/calendar-view";
import { getDemoDashboardSnapshot } from "@/lib/edu-schedule/dashboard-data";
import { findFreeSlots } from "@/lib/edu-schedule/scheduling";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const data = await getDemoDashboardSnapshot();

  const events = data.upcomingEvents.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    source: event.source,
    tags: [event.provider.toLowerCase()],
  }));

  const rangeStart = events[0]?.startsAt ?? new Date().toISOString();
  const rangeEnd = (() => {
    const base = new Date(rangeStart);
    base.setHours(base.getHours() + 12);
    return base.toISOString();
  })();
  const freeSlots = findFreeSlots(events, { rangeStart, rangeEnd, minimumMinutes: 45 });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">Calendar</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">Calendar sync</h1>
        <p className="mt-1 text-sm text-slate-500">
          Events from your timetable, email inbox, and manual entries — all in one view.
        </p>
      </div>

      <CalendarView events={events} freeSlots={freeSlots} />
    </div>
  );
}
