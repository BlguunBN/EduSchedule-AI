import { NextRequest, NextResponse } from "next/server";
import { buildCalendarIcs } from "@/lib/edu-schedule/ics";
import { getStudentCalendarEvents } from "@/lib/edu-schedule/calendar";
import { ensureDemoStudent, ensureTimetableCalendar } from "@/lib/edu-schedule/demo-student";

export async function GET(req: NextRequest) {
  const student = await ensureDemoStudent();
  await ensureTimetableCalendar(student.id);

  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");

  const events = await getStudentCalendarEvents(
    student.id,
    start ? new Date(start) : undefined,
    end ? new Date(end) : undefined,
  );

  const ics = buildCalendarIcs(events, `${student.fullName} Calendar`);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="eduschedule-calendar.ics"',
      "Cache-Control": "no-store",
    },
  });
}
