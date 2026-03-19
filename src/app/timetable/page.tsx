/**
 * @deprecated Prototype/demo page using hardcoded mock data.
 * The production timetable editor is at /dashboard/timetable.
 * This page exists only for local development reference and should not be
 * linked or indexed in production.
 */
import { Card } from "@/components/ui/card";
import { TimetableEditor } from "@/components/timetable-editor";
import { sampleTimetableEntries } from "@/lib/edu-schedule/mock-data";

export default function TimetablePage() {
  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      <Card className="p-5">
        <h1 className="text-2xl font-bold text-slate-900">Timetable workspace</h1>
        <p className="mt-1 text-sm text-slate-500">Import, inspect, and manually tidy class schedules before they feed the calendar.</p>
      </Card>
      <TimetableEditor initialEntries={sampleTimetableEntries} />
    </main>
  );
}
