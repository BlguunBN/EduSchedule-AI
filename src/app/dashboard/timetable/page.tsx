import { prisma } from "@/lib/db";
import { ensureDemoStudent } from "@/lib/edu-schedule/demo-student";
import { Day3FinishPanel } from "@/components/day3-finish-panel";

export default async function TimetablePage() {
  const student = await ensureDemoStudent();
  const timetables = await prisma.timetable.findMany({
    where: { studentId: student.id },
    include: { entries: true },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  const history = await prisma.emailProcessingLog.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return <Day3FinishPanel existingTimetables={timetables.map((tt) => ({
    id: tt.id,
    name: tt.name,
    source: tt.source,
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
  }))} existingEmailHistory={history.map((log) => ({
    id: log.id,
    subject: log.subject,
    fromAddress: log.fromAddress,
    receivedAt: log.receivedAt?.toISOString(),
    status: log.processingStatus,
    summary: log.summary,
  }))} />;
}
