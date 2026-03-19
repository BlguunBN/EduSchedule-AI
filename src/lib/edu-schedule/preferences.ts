import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureStudentPreferences } from "@/lib/edu-schedule/demo-student";

export const studentPreferencesSchema = z.object({
  studySessionMinutes: z.number().int().min(30).max(240),
  minimumFreeSlotMinutes: z.number().int().min(15).max(240),
  preferredStudyStartTime: z.string().regex(/^\d{2}:\d{2}$/),
  preferredStudyEndTime: z.string().regex(/^\d{2}:\d{2}$/),
  preferredStudyLocation: z.string().trim().max(160).nullable(),
  weekStartsOn: z.number().int().min(0).max(6),
  includeWeekends: z.boolean(),
  digestNotificationsEnabled: z.boolean(),
}).refine(
  (value) => value.preferredStudyStartTime < value.preferredStudyEndTime,
  {
    path: ["preferredStudyEndTime"],
    message: "Preferred study end time must be after the start time",
  },
);

export type StudentPreferencesInput = z.infer<typeof studentPreferencesSchema>;

export function serializePreferences(
  preferences: Awaited<ReturnType<typeof ensureStudentPreferences>>,
): StudentPreferencesInput & { studentId: string; updatedAt: string } {
  return {
    studentId: preferences.studentId,
    studySessionMinutes: preferences.studySessionMinutes,
    minimumFreeSlotMinutes: preferences.minimumFreeSlotMinutes,
    preferredStudyStartTime: preferences.preferredStudyStartTime,
    preferredStudyEndTime: preferences.preferredStudyEndTime,
    preferredStudyLocation: preferences.preferredStudyLocation,
    weekStartsOn: preferences.weekStartsOn,
    includeWeekends: preferences.includeWeekends,
    digestNotificationsEnabled: preferences.digestNotificationsEnabled,
    updatedAt: preferences.updatedAt.toISOString(),
  };
}

/**
 * Get preferences for a specific student (by ID).
 * Used in routes that already have a studentId from requireCurrentStudent().
 */
export async function getStudentPreferences(studentId: string) {
  const preferences = await ensureStudentPreferences(studentId);
  return serializePreferences(preferences);
}

/**
 * Update preferences for a specific student.
 */
export async function updateStudentPreferences(studentId: string, input: StudentPreferencesInput) {
  const preferences = await prisma.studentPreferences.upsert({
    where: { studentId },
    update: input,
    create: {
      studentId,
      ...input,
    },
  });
  return serializePreferences(preferences);
}

// ─── Legacy exports (preserved for backward-compat, remove in Phase B) ────────

/**
 * @deprecated Use getStudentPreferences(studentId) with requireCurrentStudent() instead.
 */
export async function getDemoStudentPreferences() {
  const { ensureDemoStudent } = await import("@/lib/edu-schedule/demo-student");
  const student = await ensureDemoStudent();
  const preferences = await ensureStudentPreferences(student.id);
  return {
    student,
    preferences: serializePreferences(preferences),
  };
}

/**
 * @deprecated Use updateStudentPreferences(studentId, input) with requireCurrentStudent() instead.
 */
export async function updateDemoStudentPreferences(input: StudentPreferencesInput) {
  const { ensureDemoStudent } = await import("@/lib/edu-schedule/demo-student");
  const student = await ensureDemoStudent();
  return updateStudentPreferences(student.id, input);
}
