import type { TimetableEntry, TimetableInputKind, TimetableParseResult } from "@/lib/edu-schedule/types";

function normalizeTime(value: string) {
  const trimmed = value.trim();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed.padStart(5, "0");
  return trimmed;
}

function dayToNumber(value: string) {
  const normalized = value.trim().toLowerCase();
  const map: Record<string, number> = {
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
    sunday: 0,
    sun: 0,
  };
  return map[normalized] ?? Number(normalized);
}

export function parseCsvTimetable(csvText: string): TimetableParseResult {
  const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) return { kind: "csv", entries: [], warnings: ["CSV input had no data rows."] };

  const headers = lines[0].split(",").map((cell) => cell.trim().toLowerCase());
  const entries: TimetableEntry[] = [];
  const warnings: string[] = [];

  for (const [index, line] of lines.slice(1).entries()) {
    const values = line.split(",").map((cell) => cell.trim());
    const row = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""]));
    const day = dayToNumber(row.day ?? row.weekday ?? "");

    if (!row.course && !row.coursename && !row.title) {
      warnings.push(`Row ${index + 2} skipped: missing course title.`);
      continue;
    }

    if (!Number.isInteger(day) || day < 0 || day > 6) {
      warnings.push(`Row ${index + 2} skipped: invalid day value \"${row.day ?? row.weekday ?? ""}\".`);
      continue;
    }

    entries.push({
      id: `csv-${index + 1}`,
      courseCode: row.code || row.coursecode || undefined,
      courseName: row.course || row.coursename || row.title,
      dayOfWeek: day,
      startTime: normalizeTime(row.start || row.starttime || ""),
      endTime: normalizeTime(row.end || row.endtime || ""),
      location: row.location || undefined,
      instructor: row.instructor || row.teacher || undefined,
      raw: row,
    });
  }

  return { kind: "csv", entries, warnings };
}

export function parseIcsTimetable(icsText: string): TimetableParseResult {
  const chunks = icsText.split("BEGIN:VEVENT").slice(1);
  const entries: TimetableEntry[] = [];
  const warnings: string[] = [];

  for (const [index, chunk] of chunks.entries()) {
    const summary = chunk.match(/SUMMARY:(.+)/)?.[1]?.trim();
    const location = chunk.match(/LOCATION:(.+)/)?.[1]?.trim();
    const dtStart = chunk.match(/DTSTART[^:]*:(\d{8}T\d{6})/)?.[1];
    const dtEnd = chunk.match(/DTEND[^:]*:(\d{8}T\d{6})/)?.[1];

    if (!summary || !dtStart || !dtEnd) {
      warnings.push(`VEVENT ${index + 1} skipped: missing SUMMARY/DTSTART/DTEND.`);
      continue;
    }

    const startDate = new Date(`${dtStart.slice(0, 4)}-${dtStart.slice(4, 6)}-${dtStart.slice(6, 8)}T${dtStart.slice(9, 11)}:${dtStart.slice(11, 13)}:${dtStart.slice(13, 15)}Z`);
    const endDate = new Date(`${dtEnd.slice(0, 4)}-${dtEnd.slice(4, 6)}-${dtEnd.slice(6, 8)}T${dtEnd.slice(9, 11)}:${dtEnd.slice(11, 13)}:${dtEnd.slice(13, 15)}Z`);

    entries.push({
      id: `ics-${index + 1}`,
      courseName: summary,
      dayOfWeek: startDate.getUTCDay(),
      startTime: `${String(startDate.getUTCHours()).padStart(2, "0")}:${String(startDate.getUTCMinutes()).padStart(2, "0")}`,
      endTime: `${String(endDate.getUTCHours()).padStart(2, "0")}:${String(endDate.getUTCMinutes()).padStart(2, "0")}`,
      location,
      raw: { dtStart, dtEnd },
    });
  }

  return { kind: "ics", entries, warnings };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function parseTimetableImage(_base64OrUrl: string): TimetableParseResult {
  return {
    kind: "image",
    entries: [],
    warnings: ["Image timetable parsing is not wired yet. Plug OCR or vision extraction in here."],
    unsupported: true,
  };
}

export function parseTimetableInput(kind: TimetableInputKind, payload: string): TimetableParseResult {
  switch (kind) {
    case "csv":
      return parseCsvTimetable(payload);
    case "ics":
      return parseIcsTimetable(payload);
    case "image":
      return parseTimetableImage(payload);
    default:
      return { kind, entries: [], warnings: ["Unsupported timetable input type."], unsupported: true };
  }
}
