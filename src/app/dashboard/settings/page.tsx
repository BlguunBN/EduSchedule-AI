import { SettingsForm } from "@/components/dashboard/settings-form";
import { getDemoStudentPreferences } from "@/lib/edu-schedule/preferences";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { student, preferences } = await getDemoStudentPreferences();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">Settings</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
          Student preferences
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Persist your study defaults in SQLite so the chat assistant and scheduling helpers behave consistently.
        </p>
      </div>

      <SettingsForm
        initialPreferences={preferences}
        studentName={student.fullName}
        timezone={student.timezone}
      />
    </div>
  );
}
