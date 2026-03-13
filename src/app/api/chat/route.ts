import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { runLocalChatCommand } from "@/lib/edu-schedule/chat";
import { ensureDemoStudent, ensureStudentPreferences, ensureTimetableCalendar } from "@/lib/edu-schedule/demo-student";

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  try {
    const student = await ensureDemoStudent();
    await ensureTimetableCalendar(student.id);
    const preferences = await ensureStudentPreferences(student.id);
    const payload = chatRequestSchema.parse(await req.json());

    const result = await runLocalChatCommand({
      studentId: student.id,
      message: payload.message,
      preferences: {
        studySessionMinutes: preferences.studySessionMinutes,
        minimumFreeSlotMinutes: preferences.minimumFreeSlotMinutes,
        preferredStudyStartTime: preferences.preferredStudyStartTime,
        preferredStudyEndTime: preferences.preferredStudyEndTime,
        preferredStudyLocation: preferences.preferredStudyLocation,
        weekStartsOn: preferences.weekStartsOn,
        includeWeekends: preferences.includeWeekends,
        digestNotificationsEnabled: preferences.digestNotificationsEnabled,
      },
    });

    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
