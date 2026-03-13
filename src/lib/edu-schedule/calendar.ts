import { prisma } from "@/lib/db";
import type { CalendarEvent as ScheduleCalendarEvent, CalendarEventSource } from "@/lib/edu-schedule/types";
import type { StudentStateSnapshot } from "@/lib/edu-schedule/state-snapshot";
import { captureStudentStateSnapshot } from "@/lib/edu-schedule/state-snapshot";

type EventProvider =
  | "LOCAL_MANUAL"
  | "LOCAL_CHAT"
  | "LOCAL_TIMETABLE"
  | "MICROSOFT_GRAPH"
  | "LOCAL_EMAIL_REVIEW"
  | "LOCAL";

type CreateLocalEventInput = {
  studentId: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  source: CalendarEventSource;
  historySource?: string;
  changeType?: string;
  provider?: EventProvider;
  snapshotBefore?: StudentStateSnapshot;
  recordHistory?: boolean;
};

export type CreateEventHistoryPayload = {
  action: "CREATE_EVENT";
  eventId: string;
  provider: EventProvider;
  source: CalendarEventSource;
  snapshotBefore?: StudentStateSnapshot;
};

export type ReviewApproveHistoryPayload = {
  action: "REVIEW_APPROVE";
  snapshotBefore: StudentStateSnapshot;
  previousStatus: string;
  previousProcessingStatus: string;
  createdEventId?: string | null;
  linkedEmailLogId?: string | null;
};

export type ReviewDismissHistoryPayload = {
  action: "REVIEW_DISMISS";
  snapshotBefore: StudentStateSnapshot;
  previousStatus: string;
  previousProcessingStatus: string;
  linkedEmailLogId?: string | null;
};

export type HistoryPayload =
  | CreateEventHistoryPayload
  | ReviewApproveHistoryPayload
  | ReviewDismissHistoryPayload;

export function mapCalendarSource(provider: string): CalendarEventSource {
  if (provider === "LOCAL_TIMETABLE") return "TIMETABLE";
  if (provider === "MICROSOFT_GRAPH" || provider === "LOCAL_EMAIL_REVIEW") return "EMAIL";
  if (provider === "LOCAL_CHAT") return "SYSTEM";
  if (provider === "LOCAL_MANUAL" || provider === "LOCAL") return "MANUAL";
  return "SYSTEM";
}

export function serializeCalendarEvent(event: {
  id: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  provider: string;
}): ScheduleCalendarEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description ?? undefined,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    location: event.location ?? undefined,
    source: mapCalendarSource(event.provider),
    tags: [event.provider.toLowerCase()],
  };
}

export async function getStudentCalendarEvents(studentId: string, start?: Date, end?: Date) {
  const where = {
    studentId,
    ...(start || end
      ? {
          AND: [
            ...(start ? [{ endsAt: { gt: start } }] : []),
            ...(end ? [{ startsAt: { lt: end } }] : []),
          ],
        }
      : {}),
  };

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { startsAt: "asc" },
  });

  return events.map(serializeCalendarEvent);
}

export async function createLocalEventWithHistory(input: CreateLocalEventInput) {
  const provider = input.provider ?? (input.source === "SYSTEM" ? "LOCAL_CHAT" : "LOCAL_MANUAL");
  const snapshotBefore = input.snapshotBefore ?? (input.recordHistory === false ? undefined : await captureStudentStateSnapshot(input.studentId));

  const created = await prisma.calendarEvent.create({
    data: {
      studentId: input.studentId,
      provider,
      providerEventId: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      location: input.location,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: "SCHEDULED",
    },
  });

  const rawPayload: CreateEventHistoryPayload = {
    action: "CREATE_EVENT",
    eventId: created.id,
    provider,
    source: input.source,
    snapshotBefore,
  };

  const change =
    input.recordHistory === false
      ? null
      : await prisma.scheduleChange.create({
          data: {
            studentId: input.studentId,
            changeType: input.changeType ?? "CREATE",
            source: input.historySource ?? input.source,
            title: input.title,
            details: input.description,
            effectiveFrom: created.startsAt,
            effectiveUntil: created.endsAt,
            processedAt: new Date(),
            status: "APPLIED",
            rawPayload: JSON.stringify(rawPayload),
          },
        });

  return {
    event: serializeCalendarEvent(created),
    changeId: change?.id ?? null,
  };
}

export function parseHistoryPayload(rawPayload: string | null) {
  if (!rawPayload) return null;

  try {
    const parsed = JSON.parse(rawPayload) as Partial<HistoryPayload>;
    if (
      parsed.action === "CREATE_EVENT" &&
      typeof parsed.eventId === "string"
    ) {
      return parsed as CreateEventHistoryPayload;
    }

    if (
      parsed.action === "REVIEW_APPROVE" &&
      parsed.snapshotBefore &&
      typeof parsed.previousStatus === "string"
    ) {
      return parsed as ReviewApproveHistoryPayload;
    }

    if (
      parsed.action === "REVIEW_DISMISS" &&
      parsed.snapshotBefore &&
      typeof parsed.previousStatus === "string"
    ) {
      return parsed as ReviewDismissHistoryPayload;
    }
  } catch {
    return null;
  }

  return null;
}
