"use client";

import { useState } from "react";
import { Bell, BellOff, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import type { SerializedReminder } from "@/lib/edu-schedule/reminders";

const OFFSET_LABEL: Record<string, string> = {
  "7d": "7 days before",
  "3d": "3 days before",
  "1d": "1 day before",
  "day-of": "Day of deadline",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "text-amber-700 bg-amber-50 border-amber-200",
  SENT: "text-sky-700 bg-sky-50 border-sky-200",
  DISMISSED: "text-slate-400 bg-slate-50 border-slate-100",
};

function formatDueDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOverdue(sendAt: string) {
  return new Date(sendAt) <= new Date();
}

export function RemindersPanel({
  initialReminders,
}: {
  initialReminders: SerializedReminder[];
}) {
  const [reminders, setReminders] = useState<SerializedReminder[]>(initialReminders);
  const [syncing, setSyncing] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { pushToast } = useToast();

  const visible = showAll
    ? reminders
    : reminders.filter((r) => r.status !== "DISMISSED");

  const pendingCount = reminders.filter((r) => r.status === "PENDING").length;
  const sentCount = reminders.filter((r) => r.status === "SENT").length;
  const dismissedCount = reminders.filter((r) => r.status === "DISMISSED").length;

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/reminders", { method: "POST" });
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.error?.message ?? "Sync failed");
      setReminders(result.data.reminders ?? []);
      pushToast({
        title: "Reminders synced",
        description: `${result.data.count} active reminders found.`,
        variant: "success",
      });
    } catch (err) {
      pushToast({
        title: "Sync failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "error",
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleDismiss(reminderId: string) {
    setDismissingId(reminderId);
    try {
      const res = await fetch(`/api/reminders/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DISMISSED" }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.error?.message ?? "Dismiss failed");
      setReminders((prev) =>
        prev.map((r) => (r.id === reminderId ? { ...r, status: "DISMISSED" } : r)),
      );
    } catch (err) {
      pushToast({
        title: "Dismiss failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "error",
      });
    } finally {
      setDismissingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Metric row */}
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Pending" value={pendingCount} accent="amber" />
        <MetricCard label="Delivered" value={sentCount} accent="sky" />
        <MetricCard label="Dismissed" value={dismissedCount} accent="slate" />
      </section>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          Reminders are created automatically from your deadlines and calendar events.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll((v) => !v)}
          >
            <BellOff className="h-3.5 w-3.5" />
            {showAll ? "Hide dismissed" : "Show all"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={syncing}
            onClick={handleSync}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        </div>
      </div>

      {/* Reminder list */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          {visible.length === 0 ? "No reminders" : `${visible.length} reminder${visible.length !== 1 ? "s" : ""}`}
        </h2>
        <div className="mt-4 space-y-2">
          {visible.length === 0 ? (
            <EmptyState
              label="No reminders yet"
              hint="Reminders are created from events that contain deadline keywords like &quot;exam&quot;, &quot;due&quot;, or &quot;assignment&quot;. Add events in the Timetable tab, then hit Sync."
            />
          ) : (
            visible.map((reminder) => (
              <div
                key={reminder.id}
                className={`rounded-xl border px-4 py-4 transition-opacity ${
                  reminder.status === "DISMISSED" ? "opacity-50" : ""
                } ${STATUS_COLOR[reminder.status] ?? "border-slate-200 bg-slate-50"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 shrink-0 text-current opacity-60" />
                      <p className="font-medium text-slate-900">{reminder.title}</p>
                    </div>
                    {reminder.body ? (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{reminder.body}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="default">{reminder.status}</Badge>
                    <Badge variant="sky">{OFFSET_LABEL[reminder.offsetLabel] ?? reminder.offsetLabel}</Badge>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-current/10 pt-3">
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-500">
                      Deadline: <span className="font-medium">{formatDueDate(reminder.dueAt)}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {reminder.status === "SENT"
                        ? "Delivered"
                        : isOverdue(reminder.sendAt)
                          ? "Overdue — will be delivered on next page load"
                          : `Sends: ${formatDueDate(reminder.sendAt)}`}
                    </p>
                  </div>
                  {reminder.status !== "DISMISSED" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={dismissingId === reminder.id}
                      onClick={() => handleDismiss(reminder.id)}
                    >
                      <BellOff className="h-3.5 w-3.5" />
                      {dismissingId === reminder.id ? "Dismissing…" : "Dismiss"}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "amber" | "sky" | "slate";
}) {
  const colors = {
    amber: "text-amber-600",
    sky: "text-sky-600",
    slate: "text-slate-400",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${colors[accent]}`}>{value}</p>
    </div>
  );
}

function EmptyState({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
      <Bell className="mx-auto mb-3 h-7 w-7 text-slate-200" />
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-xs text-slate-300">{hint}</p>
    </div>
  );
}
