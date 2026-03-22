"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast-provider";

const PROFILE_TIMEZONES = [
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Seoul",
  "Asia/Tokyo",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
] as const;

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

type ProfileState = {
  fullName: string;
  timezone: string;
  degreeProgram: string;
  yearOfStudy: string;
  campus: string;
};

export function SettingsForm({
  initialPreferences,
  initialProfile,
}: {
  initialPreferences: SettingsState;
  initialProfile: {
    fullName: string;
    timezone: string;
    degreeProgram: string | null;
    yearOfStudy: number | null;
    campus: string | null;
  };
}) {
  const [form, setForm] = useState(initialPreferences);
  const [profile, setProfile] = useState<ProfileState>({
    fullName: initialProfile.fullName,
    timezone: initialProfile.timezone,
    degreeProgram: initialProfile.degreeProgram ?? "",
    yearOfStudy: initialProfile.yearOfStudy != null ? String(initialProfile.yearOfStudy) : "",
    campus: initialProfile.campus ?? "",
  });
  const [saving, setSaving] = useState(false);
  const { pushToast } = useToast();
  const router = useRouter();

  function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateProfile<K extends keyof ProfileState>(key: K, value: ProfileState[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const yearNum = profile.yearOfStudy.trim();
      const profilePayload = {
        fullName: profile.fullName.trim(),
        timezone: profile.timezone.trim(),
        degreeProgram: profile.degreeProgram.trim() || null,
        yearOfStudy: yearNum === "" ? null : Number.parseInt(yearNum, 10),
        campus: profile.campus.trim() || null,
      };

      if (
        profilePayload.yearOfStudy !== null &&
        (Number.isNaN(profilePayload.yearOfStudy) ||
          profilePayload.yearOfStudy < 1 ||
          profilePayload.yearOfStudy > 12)
      ) {
        throw new Error("Year of study must be between 1 and 12, or left empty.");
      }

      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            fullName: profilePayload.fullName,
            timezone: profilePayload.timezone,
            degreeProgram: profilePayload.degreeProgram,
            yearOfStudy: profilePayload.yearOfStudy,
            campus: profilePayload.campus,
          },
          preferences: {
            studySessionMinutes: form.studySessionMinutes,
            minimumFreeSlotMinutes: form.minimumFreeSlotMinutes,
            preferredStudyStartTime: form.preferredStudyStartTime,
            preferredStudyEndTime: form.preferredStudyEndTime,
            preferredStudyLocation: form.preferredStudyLocation?.trim() || null,
            weekStartsOn: form.weekStartsOn,
            includeWeekends: form.includeWeekends,
            digestNotificationsEnabled: form.digestNotificationsEnabled,
          },
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error?.message ?? "Failed to save settings");
      }

      if (result.data?.preferences) {
        setForm(result.data.preferences);
      }
      if (result.data?.student) {
        const s = result.data.student as {
          fullName: string;
          timezone: string;
          degreeProgram: string | null;
          yearOfStudy: number | null;
          campus: string | null;
        };
        setProfile({
          fullName: s.fullName,
          timezone: s.timezone,
          degreeProgram: s.degreeProgram ?? "",
          yearOfStudy: s.yearOfStudy != null ? String(s.yearOfStudy) : "",
          campus: s.campus ?? "",
        });
      }

      router.refresh();
      pushToast({
        title: "Settings saved",
        description: "Profile and scheduling preferences are updated.",
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
        <h2 className="text-sm font-semibold text-slate-900">Academic profile</h2>
        <p className="mt-1 text-xs text-slate-500">
          Shown on your dashboard and used for calendar display. Sign-in email is managed by Microsoft.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Full name">
            <Input
              value={profile.fullName}
              onChange={(event) => updateProfile("fullName", event.target.value)}
              autoComplete="name"
            />
          </Field>
          <Field label="Timezone (IANA)">
            <Input
              value={profile.timezone}
              onChange={(event) => updateProfile("timezone", event.target.value)}
              placeholder="e.g. Asia/Shanghai"
              list="profile-timezone-options"
            />
            <datalist id="profile-timezone-options">
              {PROFILE_TIMEZONES.map((tz) => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
          </Field>
          <Field label="Degree / program">
            <Input
              value={profile.degreeProgram}
              onChange={(event) => updateProfile("degreeProgram", event.target.value)}
              placeholder="e.g. BSc Computer Science"
            />
          </Field>
          <Field label="Year of study">
            <Input
              type="number"
              min={1}
              max={12}
              value={profile.yearOfStudy}
              onChange={(event) => updateProfile("yearOfStudy", event.target.value)}
              placeholder="e.g. 2"
            />
          </Field>
          <Field label="Campus" className="md:col-span-2">
            <Input
              value={profile.campus}
              onChange={(event) => updateProfile("campus", event.target.value)}
              placeholder="e.g. Main campus"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Study defaults</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <InfoBox label="Student ID" value={form.studentId.slice(0, 6) + "…"} />
          <InfoBox label="Last preferences update" value={new Date(form.updatedAt).toLocaleString()} />
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
            description="Receive a daily summary of upcoming deadlines and schedule changes."
            checked={form.digestNotificationsEnabled}
            onChange={(checked) => update("digestNotificationsEnabled", checked)}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500">
            These preferences are saved to your profile and used by the AI scheduling assistant.
          </p>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save all"}
          </Button>
        </div>
      </section>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className ?? "block"}>
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
