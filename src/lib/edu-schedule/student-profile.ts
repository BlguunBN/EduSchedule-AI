import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

/** Common IANA timezones; free-form allowed up to max length for edge cases. */
export const studentProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  degreeProgram: z.union([z.string().trim().max(200), z.literal(""), z.null()]).optional(),
  yearOfStudy: z.union([z.number().int().min(1).max(12), z.null()]).optional(),
  campus: z.union([z.string().trim().max(120), z.literal(""), z.null()]).optional(),
});

export type StudentProfileUpdateInput = z.infer<typeof studentProfileUpdateSchema>;

export function getStudentProfileUpdateData(parsed: StudentProfileUpdateInput): Prisma.StudentUpdateInput | null {
  const data: Prisma.StudentUpdateInput = {};

  if (parsed.fullName !== undefined) data.fullName = parsed.fullName;
  if (parsed.timezone !== undefined) data.timezone = parsed.timezone;
  if (parsed.degreeProgram !== undefined) {
    data.degreeProgram =
      parsed.degreeProgram === "" || parsed.degreeProgram === null ? null : parsed.degreeProgram;
  }
  if (parsed.yearOfStudy !== undefined) data.yearOfStudy = parsed.yearOfStudy;
  if (parsed.campus !== undefined) {
    data.campus = parsed.campus === "" || parsed.campus === null ? null : parsed.campus;
  }

  return Object.keys(data).length > 0 ? data : null;
}

/** Keeps NextAuth `User.name` aligned with `Student.fullName` for dashboard session display. */
export async function syncLinkedUserName(
  tx: Prisma.TransactionClient,
  studentId: string,
  fullName: string | undefined,
) {
  if (fullName === undefined) return;
  const row = await tx.student.findUnique({
    where: { id: studentId },
    select: { userId: true },
  });
  if (!row?.userId) return;
  await tx.user.update({
    where: { id: row.userId },
    data: { name: fullName },
  });
}

export function serializeStudentProfile(student: {
  id: string;
  fullName: string;
  email: string;
  timezone: string;
  degreeProgram: string | null;
  yearOfStudy: number | null;
  campus: string | null;
  updatedAt: Date;
}) {
  return {
    id: student.id,
    fullName: student.fullName,
    email: student.email,
    timezone: student.timezone,
    degreeProgram: student.degreeProgram,
    yearOfStudy: student.yearOfStudy,
    campus: student.campus,
    updatedAt: student.updatedAt.toISOString(),
  };
}

export async function updateStudentProfile(studentId: string, input: StudentProfileUpdateInput) {
  const parsed = studentProfileUpdateSchema.parse(input);
  const data = getStudentProfileUpdateData(parsed);
  if (!data) {
    return prisma.student.findUniqueOrThrow({ where: { id: studentId } });
  }

  return prisma.$transaction(async (tx) => {
    const student = await tx.student.update({
      where: { id: studentId },
      data,
    });
    await syncLinkedUserName(tx, studentId, parsed.fullName);
    return student;
  });
}
