import { prisma } from "@/lib/db";

type SnapshotCalendarEvent = {
  id: string;
  studentId: string;
  timetableId: string | null;
  timetableEntryId: string | null;
  provider: string;
  providerEventId: string | null;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  lastSyncedAt: string | null;
};

type SnapshotTimetableEntry = {
  id: string;
  timetableId: string;
  moduleCode: string;
  moduleName: string;
  instructor: string | null;
  location: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  startDate: string | null;
  endDate: string | null;
  weekPattern: string | null;
  deliveryMode: string | null;
  notes: string | null;
};

type SnapshotTimetable = {
  id: string;
  studentId: string;
  name: string;
  source: string;
  semester: string | null;
  isActive: boolean;
  importedAt: string | null;
  entries: SnapshotTimetableEntry[];
};

export type StudentStateSnapshot = {
  capturedAt: string;
  calendarEvents: SnapshotCalendarEvent[];
  activeTimetable: SnapshotTimetable | null;
};

export async function captureStudentStateSnapshot(studentId: string): Promise<StudentStateSnapshot> {
  const [calendarEvents, activeTimetable] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { studentId },
      orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.timetable.findFirst({
      where: { studentId, isActive: true },
      include: {
        entries: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return {
    capturedAt: new Date().toISOString(),
    calendarEvents: calendarEvents.map((event) => ({
      id: event.id,
      studentId: event.studentId,
      timetableId: event.timetableId,
      timetableEntryId: event.timetableEntryId,
      provider: event.provider,
      providerEventId: event.providerEventId,
      title: event.title,
      description: event.description,
      location: event.location,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      status: event.status,
      lastSyncedAt: event.lastSyncedAt?.toISOString() ?? null,
    })),
    activeTimetable: activeTimetable
      ? {
          id: activeTimetable.id,
          studentId: activeTimetable.studentId,
          name: activeTimetable.name,
          source: activeTimetable.source,
          semester: activeTimetable.semester,
          isActive: activeTimetable.isActive,
          importedAt: activeTimetable.importedAt?.toISOString() ?? null,
          entries: activeTimetable.entries.map((entry) => ({
            id: entry.id,
            timetableId: entry.timetableId,
            moduleCode: entry.moduleCode,
            moduleName: entry.moduleName,
            instructor: entry.instructor,
            location: entry.location,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
            startDate: entry.startDate?.toISOString() ?? null,
            endDate: entry.endDate?.toISOString() ?? null,
            weekPattern: entry.weekPattern,
            deliveryMode: entry.deliveryMode,
            notes: entry.notes,
          })),
        }
      : null,
  };
}

export async function restoreStudentStateSnapshot(studentId: string, snapshot: StudentStateSnapshot) {
  await prisma.$transaction(async (tx) => {
    if (snapshot.activeTimetable) {
      await tx.timetable.upsert({
        where: { id: snapshot.activeTimetable.id },
        update: {
          studentId: snapshot.activeTimetable.studentId,
          name: snapshot.activeTimetable.name,
          source: snapshot.activeTimetable.source,
          semester: snapshot.activeTimetable.semester,
          isActive: snapshot.activeTimetable.isActive,
          importedAt: snapshot.activeTimetable.importedAt
            ? new Date(snapshot.activeTimetable.importedAt)
            : null,
        },
        create: {
          id: snapshot.activeTimetable.id,
          studentId: snapshot.activeTimetable.studentId,
          name: snapshot.activeTimetable.name,
          source: snapshot.activeTimetable.source,
          semester: snapshot.activeTimetable.semester,
          isActive: snapshot.activeTimetable.isActive,
          importedAt: snapshot.activeTimetable.importedAt
            ? new Date(snapshot.activeTimetable.importedAt)
            : null,
        },
      });

      await tx.timetableEntry.deleteMany({
        where: { timetableId: snapshot.activeTimetable.id },
      });

      if (snapshot.activeTimetable.entries.length > 0) {
        await tx.timetableEntry.createMany({
          data: snapshot.activeTimetable.entries.map((entry) => ({
            id: entry.id,
            timetableId: entry.timetableId,
            moduleCode: entry.moduleCode,
            moduleName: entry.moduleName,
            instructor: entry.instructor,
            location: entry.location,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
            startDate: entry.startDate ? new Date(entry.startDate) : null,
            endDate: entry.endDate ? new Date(entry.endDate) : null,
            weekPattern: entry.weekPattern,
            deliveryMode: entry.deliveryMode,
            notes: entry.notes,
          })),
          });
      }
    }

    await tx.calendarEvent.deleteMany({
      where: { studentId },
    });

    if (snapshot.calendarEvents.length > 0) {
      await tx.calendarEvent.createMany({
        data: snapshot.calendarEvents.map((event) => ({
          id: event.id,
          studentId: event.studentId,
          timetableId: event.timetableId,
          timetableEntryId: event.timetableEntryId,
          provider: event.provider,
          providerEventId: event.providerEventId,
          title: event.title,
          description: event.description,
          location: event.location,
          startsAt: new Date(event.startsAt),
          endsAt: new Date(event.endsAt),
          status: event.status,
          lastSyncedAt: event.lastSyncedAt ? new Date(event.lastSyncedAt) : null,
        })),
      });
    }
  });
}
