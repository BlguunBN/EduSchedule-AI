import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@eduschedule.local";
const DEMO_STUDENT_NUMBER = "DEMO-001";

const timetableEntries = [
  {
    moduleCode: "CS301",
    moduleName: "Machine Learning Systems",
    instructor: "Dr. Chen",
    location: "Lab 5",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:30",
    deliveryMode: "IN_PERSON",
  },
  {
    moduleCode: "MATH204",
    moduleName: "Discrete Mathematics",
    instructor: "Prof. Wang",
    location: "Room B-101",
    dayOfWeek: 3,
    startTime: "13:00",
    endTime: "14:30",
    deliveryMode: "IN_PERSON",
  },
  {
    moduleCode: "STAT220",
    moduleName: "Applied Statistics",
    instructor: "Dr. Liu",
    location: "Room C-210",
    dayOfWeek: 4,
    startTime: "10:00",
    endTime: "11:30",
    deliveryMode: "IN_PERSON",
  },
] as const;

const calendarEvents = [
  {
    provider: "LOCAL",
    providerEventId: "seed-workshop",
    title: "MathWorks Simulink Workshop",
    description: "Hands-on workshop for modeling and simulation with MATLAB/Simulink.",
    location: "SD554 Computer Lab, Science Building, North Campus",
    startsAt: new Date("2026-03-18T19:00:00+08:00"),
    endsAt: new Date("2026-03-18T21:00:00+08:00"),
    status: "SCHEDULED",
  },
  {
    provider: "LOCAL",
    providerEventId: "seed-physics-study",
    title: "Physics Study Session",
    description: "Review wave equations and problem set 4 before Friday.",
    location: "Library Quiet Zone",
    startsAt: new Date("2026-03-17T16:00:00+08:00"),
    endsAt: new Date("2026-03-17T18:00:00+08:00"),
    status: "SCHEDULED",
  },
] as const;

async function seed() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: "Demo Student",
      role: "STUDENT",
    },
    create: {
      email: DEMO_EMAIL,
      name: "Demo Student",
      role: "STUDENT",
    },
  });

  const student = await prisma.student.upsert({
    where: { studentNumber: DEMO_STUDENT_NUMBER },
    update: {
      userId: user.id,
      fullName: "Demo Student",
      email: DEMO_EMAIL,
      timezone: "Asia/Shanghai",
      degreeProgram: "Computer Science",
      yearOfStudy: 2,
      campus: "XJTLU",
    },
    create: {
      userId: user.id,
      studentNumber: DEMO_STUDENT_NUMBER,
      fullName: "Demo Student",
      email: DEMO_EMAIL,
      timezone: "Asia/Shanghai",
      degreeProgram: "Computer Science",
      yearOfStudy: 2,
      campus: "XJTLU",
    },
  });

  await prisma.studentPreferences.upsert({
    where: { studentId: student.id },
    update: {},
    create: {
      studentId: student.id,
      studySessionMinutes: 90,
      minimumFreeSlotMinutes: 45,
      preferredStudyStartTime: "09:00",
      preferredStudyEndTime: "20:00",
      preferredStudyLocation: "Library Quiet Zone",
      weekStartsOn: 1,
      includeWeekends: false,
      digestNotificationsEnabled: true,
    },
  });

  let timetable = await prisma.timetable.findFirst({
    where: { studentId: student.id, name: "Starter Timetable" },
  });

  if (!timetable) {
    timetable = await prisma.timetable.create({
      data: {
        studentId: student.id,
        name: "Starter Timetable",
        source: "MANUAL",
        semester: "Spring 2026",
        importedAt: new Date(),
        isActive: true,
      },
    });
  }

  const existingEntries = await prisma.timetableEntry.count({ where: { timetableId: timetable.id } });
  if (existingEntries === 0) {
    await prisma.timetableEntry.createMany({
      data: timetableEntries.map((entry) => ({
        timetableId: timetable!.id,
        ...entry,
      })),
    });
  }

  for (const event of calendarEvents) {
    await prisma.calendarEvent.upsert({
      where: {
        provider_providerEventId: {
          provider: event.provider,
          providerEventId: event.providerEventId,
        },
      },
      update: {
        studentId: student.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        status: event.status,
      },
      create: {
        studentId: student.id,
        ...event,
      },
    });
  }

  const emailLog = await prisma.emailProcessingLog.upsert({
    where: {
      provider_messageId: {
        provider: "MICROSOFT_GRAPH",
        messageId: "seed-mail-workshop",
      },
    },
    update: {
      studentId: student.id,
      subject: "Reminder: MathWorks Simulink Workshop registration is open",
      fromAddress: "events@xjtlu.edu.cn",
      receivedAt: new Date("2026-03-13T09:05:00+08:00"),
      processingStatus: "APPROVED",
      summary: "Detected a workshop event and prepared it for review.",
    },
    create: {
      studentId: student.id,
      provider: "MICROSOFT_GRAPH",
      messageId: "seed-mail-workshop",
      subject: "Reminder: MathWorks Simulink Workshop registration is open",
      fromAddress: "events@xjtlu.edu.cn",
      receivedAt: new Date("2026-03-13T09:05:00+08:00"),
      processingStatus: "APPROVED",
      summary: "Detected a workshop event and prepared it for review.",
    },
  });

  await prisma.scheduleChange.upsert({
    where: { id: "seed-change-workshop" },
    update: {
      studentId: student.id,
      changeType: "EMAIL_DETECTED",
      source: "EMAIL",
      title: "MathWorks Simulink Workshop",
      details: "Parsed from workshop registration email and approved for calendar import.",
      effectiveFrom: new Date("2026-03-18T19:00:00+08:00"),
      effectiveUntil: new Date("2026-03-18T21:00:00+08:00"),
      status: "APPLIED",
      processedAt: new Date("2026-03-13T09:07:00+08:00"),
      rawPayload: JSON.stringify({
        action: "REVIEW_APPROVE",
        previousStatus: "DETECTED",
        previousProcessingStatus: "PROCESSED",
        linkedEmailLogId: emailLog.id,
      }),
    },
    create: {
      id: "seed-change-workshop",
      studentId: student.id,
      changeType: "EMAIL_DETECTED",
      source: "EMAIL",
      title: "MathWorks Simulink Workshop",
      details: "Parsed from workshop registration email and approved for calendar import.",
      effectiveFrom: new Date("2026-03-18T19:00:00+08:00"),
      effectiveUntil: new Date("2026-03-18T21:00:00+08:00"),
      status: "APPLIED",
      processedAt: new Date("2026-03-13T09:07:00+08:00"),
      rawPayload: JSON.stringify({
        action: "REVIEW_APPROVE",
        previousStatus: "DETECTED",
        previousProcessingStatus: "PROCESSED",
        linkedEmailLogId: emailLog.id,
      }),
    },
  });

  console.log(`Seeded EduScheduleAI demo data for ${student.fullName} (${student.email})`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
