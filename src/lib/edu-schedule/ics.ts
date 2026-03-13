import type { CalendarEvent } from "@/lib/edu-schedule/types";

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatUtc(dateString: string) {
  return new Date(dateString).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildCalendarIcs(events: CalendarEvent[], calendarName = "EduScheduleAI") {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EduScheduleAI//Local Demo//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@eduschedule.local`,
      `DTSTAMP:${formatUtc(new Date().toISOString())}`,
      `DTSTART:${formatUtc(event.startsAt)}`,
      `DTEND:${formatUtc(event.endsAt)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText(event.description ?? "")}`,
      `LOCATION:${escapeIcsText(event.location ?? "")}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
