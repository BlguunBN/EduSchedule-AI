import type { CalendarEvent, FreeSlot } from "@/lib/edu-schedule/types";

const MINUTE_MS = 60_000;

function toDate(value: string) {
  return new Date(value);
}

export function findFreeSlots(
  events: CalendarEvent[],
  options: {
    rangeStart: string;
    rangeEnd: string;
    minimumMinutes?: number;
  },
): FreeSlot[] {
  const minimumMinutes = options.minimumMinutes ?? 30;
  const sorted = [...events]
    .map((event) => ({ start: toDate(event.startsAt), end: toDate(event.endsAt) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const rangeStart = toDate(options.rangeStart);
  const rangeEnd = toDate(options.rangeEnd);
  const slots: FreeSlot[] = [];
  let cursor = rangeStart;

  for (const event of sorted) {
    if (event.end <= rangeStart || event.start >= rangeEnd) continue;
    const boundedStart = event.start < rangeStart ? rangeStart : event.start;
    const boundedEnd = event.end > rangeEnd ? rangeEnd : event.end;

    if (boundedStart > cursor) {
      const durationMinutes = Math.round((boundedStart.getTime() - cursor.getTime()) / MINUTE_MS);
      if (durationMinutes >= minimumMinutes) {
        slots.push({ startsAt: cursor.toISOString(), endsAt: boundedStart.toISOString(), durationMinutes });
      }
    }

    if (boundedEnd > cursor) cursor = boundedEnd;
  }

  if (rangeEnd > cursor) {
    const durationMinutes = Math.round((rangeEnd.getTime() - cursor.getTime()) / MINUTE_MS);
    if (durationMinutes >= minimumMinutes) {
      slots.push({ startsAt: cursor.toISOString(), endsAt: rangeEnd.toISOString(), durationMinutes });
    }
  }

  return slots;
}
