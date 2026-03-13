"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast-provider";

type SettingsState = {
  studentId: string;
  updatedAt: string;
  studySessionMinutes: number;
  minimumFreeSlotMinutes: number;
  preferredStudyStartTime: string;
  preferredStudyEndTime: string;
  preferredStudyLocation: string | null;
  weekStartsOn: number;
  includeWeekends: boolean;
  digestNotificationsEnabled: boolean;
};

export function SettingsForm({
  initialPreferences,
  studentName,
  timezone,
}: {
  initialPreferences: SettingsState;
  studentName: string;
  timezone: string;
}) {
  const [form, setForm] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);
  const { pushToast } = useToast();

  function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studySessionMinutes: form.studySessionMinutes,
          minimumFreeSlotMinutes: form.minimumFreeSlotMinutes,
          preferredStudyStartTime: form.preferredStudyStartTime,
          preferredStudyEndTime: form.preferredStudyEndTime,
          preferredStudyLocation: form.preferredStudyLocation?.trim() || null,
          weekStartsOn: form.weekStartsOn,
          includeWeekends: form.includeWeekends,
          digestNotificationsEnabled: form.digestNotificationsEnabled,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error?.message ?? "Failed to save settings");
      }

      setForm(result.data.preferences);
      pushToast({
        title: "Settings saved",
        description: "Chat and scheduling helpers will use the updated preferences.",
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: "Settings not saved",
        description: error instanceof Error ? error.message : "Try again",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Student defaults</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <InfoBox label="Student" value={studentName} />
          <InfoBox label="Timezone" value={timezone} />
          <InfoBox label="Last updated" value={new Date(form.updatedAt).toLocaleString()} />
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Default study session (minutes)">
            <Input
              type="number"
              min={30}
              max={240}
              value={form.studySessionMinutes}
              onChange={(event) => update("studySessionMinutes", Number(event.target.value))}
            />
          </Field>
          <Field label="Minimum free slot (minutes)">
            <Input
              type="number"
              min={15}
              max={240}
              value={form.minimumFreeSlotMinutes}
              onChange={(event) => update("minimumFreeSlotMinutes", Number(event.target.value))}
            />
          </Field>
          <Field label="Preferred study start">
            <Input
              type="time"
              value={form.preferredStudyStartTime}
              onChange={(event) => update("preferredStudyStartTime", event.target.value)}
            />
          </Field>
          <Field label="Preferred study end">
            <Input
              type="time"
              value={form.preferredStudyEndTime}
              onChange={(event) => update("preferredStudyEndTime", event.target.value)}
            />
          </Field>
          <Field label="Preferred study location">
            <Input
              value={form.preferredStudyLocation ?? ""}
              onChange={(event) => update("preferredStudyLocation", event.target.value)}
              placeholder="Library Quiet Zone"
            />
          </Field>
          <Field label="Week starts on">
            <select
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={form.weekStartsOn}
              onChange={(event) => update("weekStartsOn", Number(event.target.value))}
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
            </select>
          </Field>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <ToggleCard
            title="Include weekends"
            description="Allow free-time suggestions and study-session creation on Saturday and Sunday."
            checked={form.includeWeekends}
            onChange={(checked) => update("includeWeekends", checked)}
          />
          <ToggleCard
            title="Digest notifications"
            description="Keeps the demo settings close to a realistic product model for future reminders."
            checked={form.digestNotificationsEnabled}
            onChange={(checked) => update("digestNotificationsEnabled", checked)}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500">
            These settings are stored in SQLite and used by the local chat assistant.
          </p>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </section>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-2 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <div>
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
