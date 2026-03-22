import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { requireCurrentStudent } from "@/lib/edu-schedule/current-student";
import {
  serializeStudentProfile,
  studentProfileUpdateSchema,
  updateStudentProfile,
} from "@/lib/edu-schedule/student-profile";

export async function GET() {
  try {
    const { student } = await requireCurrentStudent();
    return jsonOk({ student: serializeStudentProfile(student) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { student } = await requireCurrentStudent();
    const body = studentProfileUpdateSchema.parse(await req.json());
    const updated = await updateStudentProfile(student.id, body);
    return jsonOk({ student: serializeStudentProfile(updated) });
  } catch (error) {
    return jsonError(error);
  }
}
