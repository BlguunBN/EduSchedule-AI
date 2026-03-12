export type CalendarEventSource = "MANUAL" | "TIMETABLE" | "EMAIL" | "SYSTEM";

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  source: CalendarEventSource;
  tags: string[];
};

export type TimetableInputKind = "ics" | "csv" | "image";

export type TimetableEntry = {
  id: string;
  courseCode?: string;
  courseName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
  instructor?: string;
  raw?: Record<string, unknown>;
};

export type TimetableParseResult = {
  kind: TimetableInputKind;
  entries: TimetableEntry[];
  warnings: string[];
  unsupported?: boolean;
};

export type EmailPriority = "LOW" | "MEDIUM" | "HIGH";
export type EmailCategory = "COURSEWORK" | "SCHEDULING" | "ADMIN" | "SOCIAL" | "OTHER";

export type EmailMessage = {
  id: string;
  subject: string;
  from: string;
  receivedAt: string;
  bodyText: string;
};

export type EmailActionItem = {
  label: string;
  dueHint?: string;
  confidence: number;
};

export type EmailScanResult = {
  message: EmailMessage;
  category: EmailCategory;
  priority: EmailPriority;
  summary: string;
  actionItems: EmailActionItem[];
  extractedDates: string[];
  extractedLocations: string[];
};

export type FreeSlot = {
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
};
