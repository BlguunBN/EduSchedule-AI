import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { ensureDemoStudent, ensureTimetableCalendar } from "@/lib/edu-schedule/demo-student";
import { findFreeSlots } from "@/lib/edu-schedule/scheduling";
import type { CalendarEvent } from "@/lib/edu-schedule/types";

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
    const student = await ensureDemoStudent();
    await ensureTimetableCalendar(student.id);

    const start = req.nextUrl.searchParams.get("start");
    const end = req.nextUrl.searchParams.get("end");
    const minimumMinutes = Number(req.nextUrl.searchParams.get("minimumMinutes") ?? "30");

    const where = {
      studentId: student.id,
      ...(start || end
        ? {
            startsAt: {
              ...(start ? { gte: new Date(start) } : {}),
              ...(end ? { lt: new Date(end) } : {}),
            },
          }
        : {}),
    };

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startsAt: "asc" },
    });

    const serialized: CalendarEvent[] = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description ?? undefined,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      location: event.location ?? undefined,
      source:
        event.provider === "LOCAL_TIMETABLE"
          ? "TIMETABLE"
          : event.provider === "MICROSOFT_GRAPH"
            ? "EMAIL"
            : "MANUAL",
      tags: [event.provider.toLowerCase()],
    }));

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
    const student = await ensureDemoStudent();
    const payload = eventCreateSchema.parse(await req.json());

    const created = await prisma.calendarEvent.create({
      data: {
        studentId: student.id,
        provider: "LOCAL_MANUAL",
        providerEventId: crypto.randomUUID(),
        title: payload.title,
        description: payload.description,
        location: payload.location,
        startsAt: new Date(payload.startsAt),
        endsAt: new Date(payload.endsAt),
        status: "SCHEDULED",
      },
    });

    await prisma.scheduleChange.create({
      data: {
        studentId: student.id,
        changeType: "CREATE",
        source: payload.source,
        title: payload.title,
        details: payload.description,
        effectiveFrom: created.startsAt,
        effectiveUntil: created.endsAt,
        status: "APPLIED",
        rawPayload: JSON.stringify(payload),
      },
    });

    return jsonOk(
      {
        event: {
          id: created.id,
          title: created.title,
          description: created.description ?? undefined,
          startsAt: created.startsAt.toISOString(),
          endsAt: created.endsAt.toISOString(),
          location: created.location ?? undefined,
          source: payload.source,
          tags: ["manual"],
        },
        persisted: true,
      },
      201,
    );
  } catch (error) {
    return jsonError(error);
  }
}
