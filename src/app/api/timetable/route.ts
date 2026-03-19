import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireCurrentStudent } from "@/lib/edu-schedule/current-student";
import { ensureTimetableCalendar } from "@/lib/edu-schedule/demo-student";
import { parseTimetableInput } from "@/lib/edu-schedule/timetable-parsers";

const manualEntrySchema = z.object({
  id: z.string(),
  courseCode: z.string().optional(),
  courseName: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().min(4),
  endTime: z.string().min(4),
  location: z.string().optional(),
  instructor: z.string().optional(),
});

const saveSchema = z.object({
  name: z.string().min(1).max(120).default("Imported Timetable"),
  kind: z.enum(["csv", "ics", "image"]).optional(),
  payload: z.string().optional(),
  entries: z.array(manualEntrySchema).optional(),
});

export async function GET() {
  try {
    const { student } = await requireCurrentStudent();
    const timetables = await prisma.timetable.findMany({
      where: { studentId: student.id },
      include: { entries: true },
      orderBy: { updatedAt: "desc" },
    });

    return jsonOk({
      timetables: timetables.map((tt) => ({
        id: tt.id,
        name: tt.name,
        source: tt.source,
        semester: tt.semester,
        updatedAt: tt.updatedAt.toISOString(),
        entries: tt.entries.map((entry) => ({
          id: entry.id,
          courseCode: entry.moduleCode,
          courseName: entry.moduleName,
          dayOfWeek: entry.dayOfWeek,
          startTime: entry.startTime,
          endTime: entry.endTime,
          location: entry.location ?? undefined,
          instructor: entry.instructor ?? undefined,
        })),
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { student } = await requireCurrentStudent();
    const payload = saveSchema.parse(await req.json());
    const parsedEntries = payload.entries ?? (payload.kind && payload.payload ? parseTimetableInput(payload.kind, payload.payload).entries : []);

    await prisma.timetable.updateMany({
      where: { studentId: student.id, isActive: true },
      data: { isActive: false },
    });

    const timetable = await prisma.timetable.create({
      data: {
        studentId: student.id,
        name: payload.name,
        source: (payload.kind ?? "MANUAL").toUpperCase(),
        semester: "Spring 2026",
        isActive: true,
        importedAt: new Date(),
        entries: {
          create: parsedEntries.map((entry) => ({
            moduleCode: entry.courseCode ?? entry.courseName.slice(0, 8).toUpperCase(),
            moduleName: entry.courseName,
            instructor: entry.instructor,
            location: entry.location,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
            notes: undefined,
          })),
        },
      },
      include: { entries: true },
    });

    await ensureTimetableCalendar(student.id);

    return jsonOk(
      {
        timetableId: timetable.id,
        entryCount: timetable.entries.length,
        persisted: true,
      },
      201,
    );
  } catch (error) {
    return jsonError(error);
  }
}
