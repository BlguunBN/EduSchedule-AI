import { Card } from "@/components/ui/card";
import { sampleCalendarEvents } from "@/lib/edu-schedule/mock-data";
import { findFreeSlots } from "@/lib/edu-schedule/scheduling";

export default function CalendarPage() {
  const freeSlots = findFreeSlots(sampleCalendarEvents, {
    rangeStart: "2026-03-13T07:00:00.000Z",
    rangeEnd: "2026-03-13T20:00:00.000Z",
    minimumMinutes: 45,
  });

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      <Card className="p-5">
        <h1 className="text-2xl font-bold text-slate-900">Calendar planning</h1>
        <p className="mt-1 text-sm text-slate-500">Seeded schedule view plus a first-pass free-slot finder for study planning.</p>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming events</h2>
          <div className="mt-4 space-y-3">
            {sampleCalendarEvents.map((event) => (
              <div key={event.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-900">{event.title}</div>
                    <div className="text-sm text-slate-500">{new Date(event.startsAt).toLocaleString()} → {new Date(event.endsAt).toLocaleTimeString()}</div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{event.source}</span>
                </div>
                {(event.location || event.description) && (
                  <div className="mt-2 text-sm text-slate-600">{event.location}{event.location && event.description ? " · " : ""}{event.description}</div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold text-slate-900">Suggested free slots</h2>
          <p className="mt-1 text-sm text-slate-500">Computed with <code>findFreeSlots</code> so the API and UI share scheduling logic.</p>
          <div className="mt-4 space-y-3">
            {freeSlots.map((slot) => (
              <div key={slot.startsAt} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                <div className="font-medium">{new Date(slot.startsAt).toLocaleTimeString()} → {new Date(slot.endsAt).toLocaleTimeString()}</div>
                <div>{slot.durationMinutes} minutes available</div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
            API skeleton: <code>/api/calendar/events</code>
          </div>
        </Card>
      </section>
    </main>
  );
}
