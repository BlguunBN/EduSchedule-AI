import { SettingsForm } from "@/components/dashboard/settings-form";
import { requireCurrentStudent } from "@/lib/edu-schedule/current-student";
import { getStudentPreferences } from "@/lib/edu-schedule/preferences";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { student } = await requireCurrentStudent();
  const preferences = await getStudentPreferences(student.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">Settings</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
          Profile &amp; preferences
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Update your academic profile and study defaults — used across the dashboard, calendar, and AI
          assistant.
        </p>
      </div>

      <SettingsForm
        initialPreferences={preferences}
        initialProfile={{
          fullName: student.fullName,
          timezone: student.timezone,
          degreeProgram: student.degreeProgram,
          yearOfStudy: student.yearOfStudy,
          campus: student.campus,
        }}
      />
    </div>
  );
}
