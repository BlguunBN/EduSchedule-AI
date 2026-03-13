import { prisma } from "@/lib/db";
import { sampleCalendarEvents, sampleTimetableEntries } from "@/lib/edu-schedule/mock-data";

const DEMO_EMAIL = "demo@eduschedule.local";
const DEMO_STUDENT_NUMBER = "DEMO-001";
const DEFAULT_PREFERENCES = {
  studySessionMinutes: 90,
  minimumFreeSlotMinutes: 45,
  preferredStudyStartTime: "09:00",
  preferredStudyEndTime: "20:00",
  preferredStudyLocation: "Library Quiet Zone",
  weekStartsOn: 1,
  includeWeekends: false,
  digestNotificationsEnabled: true,
} as const;

function parseTimeOnDate(base: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(base);
  next.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return next;
}

function nextDateForWeekday(dayOfWeek: number) {
  const now = new Date();
  const date = new Date(now);
  const diff = (dayOfWeek - now.getDay() + 7) % 7;
  date.setDate(now.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function ensureDemoStudent() {
  const existingUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: "Demo Student",
        role: "STUDENT",
      },
    }));

  const existingStudent = await prisma.student.findUnique({ where: { studentNumber: DEMO_STUDENT_NUMBER } });
  const student =
    existingStudent ??
    (await prisma.student.create({
      data: {
        userId: user.id,
        studentNumber: DEMO_STUDENT_NUMBER,
        fullName: "Demo Student",
        email: DEMO_EMAIL,
        timezone: "Asia/Shanghai",
        degreeProgram: "Computer Science",
        yearOfStudy: 2,
        campus: "XJTLU",
      },
    }));

  const timetableCount = await prisma.timetable.count({ where: { studentId: student.id } });
  if (timetableCount === 0) {
    const timetable = await prisma.timetable.create({
      data: {
        studentId: student.id,
        name: "Starter Timetable",
        source: "MANUAL",
        semester: "Spring 2026",
        importedAt: new Date(),
      },
    });

    await prisma.timetableEntry.createMany({
      data: sampleTimetableEntries.map((entry) => ({
        timetableId: timetable.id,
        moduleCode: entry.courseCode ?? entry.courseName.slice(0, 8).toUpperCase(),
        moduleName: entry.courseName,
        instructor: entry.instructor,
        location: entry.location,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        deliveryMode: "IN_PERSON",
        notes: entry.raw ? JSON.stringify(entry.raw) : null,
      })),
    });
  }

  const eventCount = await prisma.calendarEvent.count({ where: { studentId: student.id } });
  if (eventCount === 0) {
    await prisma.calendarEvent.createMany({
      data: sampleCalendarEvents.map((event) => ({
        studentId: student.id,
        provider: "LOCAL",
        providerEventId: `seed-${event.id}`,
        title: event.title,
        description: event.description,
        location: event.location,
        startsAt: new Date(event.startsAt),
        endsAt: new Date(event.endsAt),
        status: "SCHEDULED",
      })),
    });
  }

  return student;
}

export async function ensureStudentPreferences(studentId: string) {
  return prisma.studentPreferences.upsert({
    where: { studentId },
    update: {},
    create: {
      studentId,
      ...DEFAULT_PREFERENCES,
    },
  });
}

export async function ensureTimetableCalendar(studentId: string) {
  const activeTimetable = await prisma.timetable.findFirst({
    where: { studentId, isActive: true },
    include: { entries: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!activeTimetable) {
    return null;
  }

  for (const entry of activeTimetable.entries) {
    const baseDate = nextDateForWeekday(entry.dayOfWeek);
    const startsAt = parseTimeOnDate(baseDate, entry.startTime);
    const endsAt = parseTimeOnDate(baseDate, entry.endTime);
    const providerEventId = `tt-${entry.id}-${startsAt.toISOString().slice(0, 10)}`;

    await prisma.calendarEvent.upsert({
      where: {
        provider_providerEventId: {
          provider: "LOCAL_TIMETABLE",
          providerEventId,
        },
      },
      update: {
        title: entry.moduleName,
        description: entry.instructor ?? undefined,
        location: entry.location ?? undefined,
        startsAt,
        endsAt,
        studentId,
        timetableId: activeTimetable.id,
        timetableEntryId: entry.id,
      },
      create: {
        studentId,
        timetableId: activeTimetable.id,
        timetableEntryId: entry.id,
        provider: "LOCAL_TIMETABLE",
        providerEventId,
        title: entry.moduleName,
        description: entry.instructor ?? undefined,
        location: entry.location ?? undefined,
        startsAt,
        endsAt,
        status: "SCHEDULED",
      },
    });
  }

  return activeTimetable;
}

export { DEFAULT_PREFERENCES };
