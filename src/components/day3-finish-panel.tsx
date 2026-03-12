"use client";

import { useMemo, useState } from "react";
import { Plus, Save, ScanLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, statusVariant } from "@/components/ui/badge";
import { parseTimetableInput } from "@/lib/edu-schedule/timetable-parsers";
import { sampleTimetableEntries } from "@/lib/edu-schedule/mock-data";
import type { EmailScanResult, TimetableEntry, TimetableInputKind } from "@/lib/edu-schedule/types";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const dayColors = [
  "bg-slate-100 text-slate-500",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-slate-100 text-slate-500",
];

type HistoryItem = {
  id: string;
  subject?: string | null;
  fromAddress?: string | null;
  receivedAt?: string;
  status: string;
  summary?: string | null;
};

type ExistingTimetable = {
  id: string;
  name: string;
  source: string;
  updatedAt: string;
  entries: TimetableEntry[];
};

export function Day3FinishPanel({
  existingTimetables,
  existingEmailHistory,
}: {
  existingTimetables: ExistingTimetable[];
  existingEmailHistory: HistoryItem[];
}) {
  const [entries, setEntries] = useState<TimetableEntry[]>(
    existingTimetables[0]?.entries ?? sampleTimetableEntries,
  );
  const [timetableName, setTimetableName] = useState(
    existingTimetables[0]?.name ?? "Spring 2026 Timetable",
  );
  const [importKind, setImportKind] = useState<TimetableInputKind>("csv");
  const [importText, setImportText] = useState(
    "course,day,start,end,location\nOperating Systems,Monday,10:00,11:30,Room C-301",
  );
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<string>("");
  const [scanState, setScanState] = useState<string>("");
  const [emailResults, setEmailResults] = useState<EmailScanResult[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>(existingEmailHistory);

  const grouped = useMemo(
    () =>
      dayLabels.map((label, dayOfWeek) => ({
        label,
        entries: entries.filter((e) => e.dayOfWeek === dayOfWeek),
      })),
    [entries],
  );

  const addBlank = () => {
    setEntries((prev) => [
      ...prev,
      { id: `manual-${Date.now()}`, courseName: "New Class", dayOfWeek: 1, startTime: "09:00", endTime: "10:00" },
    ]);
  };

  const updateEntry = (id: string, patch: Partial<TimetableEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const removeEntry = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id));

  const parseImport = () => {
    const result = parseTimetableInput(importKind, importText);
    setWarnings(result.warnings);
    if (result.entries.length > 0) {
      setEntries((prev) => [
        ...prev,
        ...result.entries.map((e, i) => ({ ...e, id: `${e.id}-${Date.now()}-${i}` })),
      ]);
    }
  };

  const saveTimetable = async () => {
    setSaveState("Saving…");
    const response = await fetch("/api/timetable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: timetableName, entries }),
    });
    const result = await response.json();
    setSaveState(
      response.ok ? `Saved ${result.data.entryCount} entries.` : "Save failed — try again.",
    );
  };

  const scanInbox = async () => {
    setScanState("Scanning mock inbox…");
    const response = await fetch("/api/emails/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "mock", persistDetectedEvents: true }),
    });
    const result = await response.json();
    if (response.ok) {
      setEmailResults(result.data.results ?? []);
      setHistory(result.data.history ?? []);
      setScanState(`Scanned ${result.data.count} messages.`);
    } else {
      setScanState("Inbox scan failed.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">Timetables</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">Timetable workspace</h1>
        <p className="mt-1 text-sm text-slate-500">
          Edit classes, import schedules, scan your inbox, and save everything to the local database.
        </p>
      </div>

      {/* Weekly snapshot */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Weekly snapshot</h2>
        <p className="mt-0.5 text-xs text-slate-400">A quick view of classes across the week.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {grouped.map((group, dayIndex) => (
            <div key={group.label} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <p className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${dayColors[dayIndex]}`}>
                {group.label}
              </p>
              <div className="mt-2 space-y-1.5">
                {group.entries.length === 0 ? (
                  <p className="text-xs text-slate-300">Free</p>
                ) : (
                  group.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded border border-sky-100 bg-sky-50 px-2 py-1.5"
                    >
                      <p className="text-xs font-medium text-sky-900 truncate leading-snug">
                        {entry.courseName}
                      </p>
                      <p className="text-[11px] text-sky-600 mt-0.5">
                        {entry.startTime}–{entry.endTime}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor + import */}
      <div className="grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
        {/* Timetable editor */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Class schedule</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Edit classes below, then save to the local database.
              </p>
            </div>
            <Button size="sm" onClick={addBlank}>
              <Plus className="h-3.5 w-3.5" />
              Add class
            </Button>
          </div>

          {/* Timetable name */}
          <div className="mt-4">
            <label className="text-xs font-medium text-slate-500" htmlFor="timetable-name">
              Timetable name
            </label>
            <Input
              id="timetable-name"
              className="mt-1"
              value={timetableName}
              onChange={(e) => setTimetableName(e.target.value)}
              placeholder="e.g. Spring 2026 Timetable"
            />
          </div>

          {/* Entry rows */}
          <div className="mt-4 space-y-2">
            {entries.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-10 text-center">
                <p className="text-sm text-slate-400">No classes yet.</p>
                <p className="mt-1 text-xs text-slate-300">Click &ldquo;Add class&rdquo; above to start.</p>
              </div>
            )}
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2"
              >
                {/* Row 1: course + day + times + remove */}
                <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto]">
                  <Input
                    value={entry.courseName}
                    onChange={(e) => updateEntry(entry.id, { courseName: e.target.value })}
                    placeholder="Course name"
                  />
                  <select
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    value={entry.dayOfWeek}
                    onChange={(e) => updateEntry(entry.id, { dayOfWeek: Number(e.target.value) })}
                  >
                    {dayLabels.map((label, index) => (
                      <option key={label} value={index}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="time"
                    value={entry.startTime}
                    onChange={(e) => updateEntry(entry.id, { startTime: e.target.value })}
                    className="w-28"
                  />
                  <Input
                    type="time"
                    value={entry.endTime}
                    onChange={(e) => updateEntry(entry.id, { endTime: e.target.value })}
                    className="w-28"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEntry(entry.id)}
                    aria-label="Remove class"
                    className="text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {/* Row 2: location + instructor + code */}
                <div className="grid gap-2 md:grid-cols-3">
                  <Input
                    value={entry.location ?? ""}
                    onChange={(e) => updateEntry(entry.id, { location: e.target.value })}
                    placeholder="Location"
                  />
                  <Input
                    value={entry.instructor ?? ""}
                    onChange={(e) => updateEntry(entry.id, { instructor: e.target.value })}
                    placeholder="Instructor"
                  />
                  <Input
                    value={entry.courseCode ?? ""}
                    onChange={(e) => updateEntry(entry.id, { courseCode: e.target.value })}
                    placeholder="Module code"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Save action */}
          <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
            <Button onClick={saveTimetable}>
              <Save className="h-4 w-4" />
              Save locally
            </Button>
            {saveState && (
              <p className="text-sm text-slate-500">{saveState}</p>
            )}
          </div>
        </div>

        {/* Import sandbox */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Import parser</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Paste CSV or ICS text and merge parsed rows into the editor.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Format</label>
              <select
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={importKind}
                onChange={(e) => setImportKind(e.target.value as TimetableInputKind)}
              >
                <option value="csv">CSV</option>
                <option value="ics">ICS</option>
                <option value="image">Image stub</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Paste content</label>
              <textarea
                className="mt-1 min-h-44 w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
            </div>
            <Button className="w-full" variant="outline" onClick={parseImport}>
              Parse into editor
            </Button>
            {warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                {warnings.join(" ")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inbox scan + history */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Inbox scan */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Inbox scan</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Run the email pipeline and persist processing history locally.
              </p>
            </div>
            <Button size="sm" onClick={scanInbox}>
              <ScanLine className="h-3.5 w-3.5" />
              Scan inbox
            </Button>
          </div>

          {scanState && (
            <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500 border border-slate-100">
              {scanState}
            </p>
          )}

          <div className="mt-4 space-y-2">
            {emailResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-8 text-center">
                <p className="text-sm text-slate-400">No scan results yet.</p>
                <p className="mt-1 text-xs text-slate-300">Run a scan above to see results.</p>
              </div>
            ) : (
              emailResults.map((result) => (
                <div
                  key={result.message.id}
                  className="flex flex-col gap-1.5 rounded-lg border-l-4 border-l-sky-300 border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate leading-snug">
                        {result.message.subject}
                      </p>
                      <p className="text-xs text-slate-400">{result.message.from}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <Badge variant="default">{result.category}</Badge>
                      <Badge variant="amber">{result.priority}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{result.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Email processing history */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Email processing history</h2>
          <div className="mt-4 space-y-2">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-8 text-center">
                <p className="text-sm text-slate-400">No history yet.</p>
                <p className="mt-1 text-xs text-slate-300">Scan the inbox to populate this list.</p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-1 rounded-lg border-l-4 border-l-slate-200 border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium text-slate-900 leading-snug">
                      {item.subject ?? "Untitled email"}
                    </p>
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    {item.fromAddress ?? "Unknown sender"}
                    {item.receivedAt
                      ? ` · ${new Date(item.receivedAt).toLocaleString()}`
                      : ""}
                  </p>
                  {item.summary && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.summary}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
