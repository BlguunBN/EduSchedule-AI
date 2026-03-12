"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseTimetableInput } from "@/lib/edu-schedule/timetable-parsers";
import type { TimetableEntry, TimetableInputKind } from "@/lib/edu-schedule/types";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TimetableEditor({ initialEntries }: { initialEntries: TimetableEntry[] }) {
  const [entries, setEntries] = useState<TimetableEntry[]>(initialEntries);
  const [draft, setDraft] = useState<TimetableEntry>({
    id: "draft",
    courseName: "",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:00",
  });
  const [importKind, setImportKind] = useState<TimetableInputKind>("csv");
  const [importText, setImportText] = useState("course,day,start,end,location\nOperating Systems,Monday,10:00,11:30,Room C-301");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  const grouped = useMemo(() => {
    return dayLabels.map((label, dayOfWeek) => ({
      label,
      dayOfWeek,
      entries: entries.filter((entry) => entry.dayOfWeek === dayOfWeek),
    }));
  }, [entries]);

  const addEntry = () => {
    if (!draft.courseName.trim()) return;
    setEntries((current) => [...current, { ...draft, id: `entry-${Date.now()}`, courseName: draft.courseName.trim() }]);
    setDraft({ id: "draft", courseName: "", dayOfWeek: 1, startTime: "09:00", endTime: "10:00" });
  };

  const importEntries = () => {
    const result = parseTimetableInput(importKind, importText);
    setEntries((current) => [...current, ...result.entries.map((entry, index) => ({ ...entry, id: `${entry.id}-${Date.now()}-${index}` }))]);
    setImportWarnings(result.warnings);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Weekly timetable</h2>
            <p className="text-sm text-slate-500">Edit manually now, swap to persistence later.</p>
          </div>
          <Button onClick={addEntry}>Add class</Button>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <Input placeholder="Course name" value={draft.courseName} onChange={(e) => setDraft((prev) => ({ ...prev, courseName: e.target.value }))} />
          <Input placeholder="Course code" value={draft.courseCode ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, courseCode: e.target.value }))} />
          <select className="h-10 rounded-md border border-slate-200 px-3 text-sm" value={draft.dayOfWeek} onChange={(e) => setDraft((prev) => ({ ...prev, dayOfWeek: Number(e.target.value) }))}>
            {dayLabels.map((label, index) => <option key={label} value={index}>{label}</option>)}
          </select>
          <Input type="time" value={draft.startTime} onChange={(e) => setDraft((prev) => ({ ...prev, startTime: e.target.value }))} />
          <Input type="time" value={draft.endTime} onChange={(e) => setDraft((prev) => ({ ...prev, endTime: e.target.value }))} />
          <Input placeholder="Location" value={draft.location ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, location: e.target.value }))} />
          <Input placeholder="Instructor" value={draft.instructor ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, instructor: e.target.value }))} className="md:col-span-2 xl:col-span-3" />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {grouped.map((group) => (
            <div key={group.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="font-medium text-slate-900">{group.label}</h3>
              <div className="mt-2 space-y-2 text-sm">
                {group.entries.length === 0 && <p className="text-slate-400">No classes</p>}
                {group.entries.map((entry) => (
                  <div key={entry.id} className="rounded-md border border-slate-200 bg-white p-2">
                    <div className="font-medium text-slate-900">{entry.courseName}</div>
                    <div className="text-slate-500">{entry.startTime}–{entry.endTime}</div>
                    {(entry.location || entry.instructor) && <div className="text-slate-500">{entry.location} {entry.instructor ? `· ${entry.instructor}` : ""}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold text-slate-900">Import parser sandbox</h2>
        <p className="mt-1 text-sm text-slate-500">CSV and ICS work now. Image parsing is stubbed with a TODO path for OCR/vision.</p>
        <div className="mt-4 space-y-3">
          <select className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={importKind} onChange={(e) => setImportKind(e.target.value as TimetableInputKind)}>
            <option value="csv">CSV</option>
            <option value="ics">ICS</option>
            <option value="image">Image stub</option>
          </select>
          <textarea className="min-h-56 w-full rounded-md border border-slate-200 p-3 text-sm" value={importText} onChange={(e) => setImportText(e.target.value)} />
          <Button className="w-full" onClick={importEntries}>Parse and append entries</Button>
          {importWarnings.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-medium">Warnings</div>
              <ul className="mt-2 list-disc pl-5">
                {importWarnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
