import { prisma } from "@/lib/db";
import { mapCalendarSource } from "@/lib/edu-schedule/calendar";
import { ensureDemoStudent, ensureTimetableCalendar } from "@/lib/edu-schedule/demo-student";
import { getMicrosoftGraphStatus } from "@/lib/edu-schedule/graph";

export const dynamic = "force-dynamic";

export async function getDemoDashboardSnapshot() {
  const student = await ensureDemoStudent();
  await ensureTimetableCalendar(student.id);

  const now = new Date();
  const [activeTimetable, timetables, upcomingEvents, recentChanges, emailHistory, graphStatus] = await Promise.all([
    prisma.timetable.findFirst({
      where: { studentId: student.id, isActive: true },
      include: { entries: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.timetable.findMany({
      where: { studentId: student.id },
      include: { entries: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.calendarEvent.findMany({
      where: { studentId: student.id, endsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 12,
    }),
    prisma.scheduleChange.findMany({
      where: { studentId: student.id },
      orderBy: { detectedAt: "desc" },
      take: 12,
    }),
    prisma.emailProcessingLog.findMany({
      where: { studentId: student.id },
      orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
    getMicrosoftGraphStatus(student.userId),
  ]);

  const pendingStatuses = new Set(["PENDING", "DETECTED"]);
  const reviewQueue = recentChanges
    .filter((item) => pendingStatuses.has(item.status))
    .map((change) => {
      const relatedLog = emailHistory.find((log) => log.matchedChangeId === change.id);
      return {
        id: change.id,
        title: change.title,
        status: change.status,
        details: change.details,
        detectedAt: change.detectedAt.toISOString(),
        effectiveFrom: change.effectiveFrom?.toISOString(),
        effectiveUntil: change.effectiveUntil?.toISOString(),
        emailLogId: relatedLog?.id ?? null,
        subject: relatedLog?.subject ?? change.title,
        fromAddress: relatedLog?.fromAddress ?? null,
        receivedAt: relatedLog?.receivedAt?.toISOString() ?? null,
        processingStatus: relatedLog?.processingStatus ?? null,
      };
    });

  return {
    student,
    graphStatus,
    metrics: {
      activeTimetables: timetables.filter((item) => item.isActive).length,
      timetableEntries: activeTimetable?.entries.length ?? 0,
      upcomingEvents: upcomingEvents.length,
      pendingChanges: recentChanges.filter((item) => pendingStatuses.has(item.status)).length,
      processedEmails: emailHistory.filter((item) => item.processingStatus !== "RECEIVED").length,
    },
    activeTimetable,
    timetables,
    upcomingEvents: upcomingEvents.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      status: event.status,
      source: mapCalendarSource(event.provider),
      provider: event.provider,
    })),
    recentChanges: recentChanges.map((change) => ({
      id: change.id,
      title: change.title,
      changeType: change.changeType,
      source: change.source,
      status: change.status,
      details: change.details,
      effectiveFrom: change.effectiveFrom?.toISOString(),
      effectiveUntil: change.effectiveUntil?.toISOString(),
      detectedAt: change.detectedAt.toISOString(),
    })),
    emailHistory: emailHistory.map((log) => ({
      id: log.id,
      subject: log.subject,
      fromAddress: log.fromAddress,
      status: log.processingStatus,
      summary: log.summary,
      matchedChangeId: log.matchedChangeId,
      receivedAt: log.receivedAt?.toISOString() ?? null,
      createdAt: log.createdAt.toISOString(),
    })),
    reviewQueue,
  };
}
