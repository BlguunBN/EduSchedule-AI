import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { createLocalEventWithHistory, getStudentCalendarEvents } from "@/lib/edu-schedule/calendar";
import { requireCurrentStudent } from "@/lib/edu-schedule/current-student";
import { ensureTimetableCalendar } from "@/lib/edu-schedule/demo-student";
import { findFreeSlots } from "@/lib/edu-schedule/scheduling";
import { syncRemindersFromCalendarEvents } from "@/lib/edu-schedule/reminders";

const eventCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(5000).optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    location: z.string().trim().max(160).optional(),
    source: z.enum(["MANUAL", "TIMETABLE", "EMAIL", "SYSTEM"]).default("MANUAL"),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });

export async function GET(req: NextRequest) {
  try {
    const { student } = await requireCurrentStudent();
    await ensureTimetableCalendar(student.id);

    const start = req.nextUrl.searchParams.get("start");
    const end = req.nextUrl.searchParams.get("end");
    const minimumMinutes = Number(req.nextUrl.searchParams.get("minimumMinutes") ?? "30");

    const serialized = await getStudentCalendarEvents(
      student.id,
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined,
    );

    const rangeStart = start ?? serialized[0]?.startsAt ?? new Date().toISOString();
    const rangeEnd =
      end ??
      (() => {
        const next = new Date(rangeStart);
        next.setHours(next.getHours() + 12);
        return next.toISOString();
      })();

    return jsonOk({
      events: serialized,
      freeSlots: findFreeSlots(serialized, { rangeStart, rangeEnd, minimumMinutes }),
      persisted: true,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { student } = await requireCurrentStudent();
    const payload = eventCreateSchema.parse(await req.json());

    const created = await createLocalEventWithHistory({
      studentId: student.id,
      title: payload.title,
      description: payload.description,
      location: payload.location,
      startsAt: new Date(payload.startsAt),
      endsAt: new Date(payload.endsAt),
      source: payload.source,
    });

    // Auto-schedule reminders if this looks like a deadline event
    await syncRemindersFromCalendarEvents(student.id);

    return jsonOk(
      {
        event: created.event,
        changeId: created.changeId,
        persisted: true,
      },
      201,
    );
  } catch (error) {
    return jsonError(error);
  }
}
