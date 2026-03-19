import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { requireCurrentStudent } from "@/lib/edu-schedule/current-student";
import {
  getStudentPreferences,
  studentPreferencesSchema,
  updateStudentPreferences,
} from "@/lib/edu-schedule/preferences";

export async function GET() {
  try {
    const { student } = await requireCurrentStudent();
    const preferences = await getStudentPreferences(student.id);

    return jsonOk({
      student: {
        id: student.id,
        fullName: student.fullName,
        timezone: student.timezone,
      },
      preferences,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { student } = await requireCurrentStudent();
    const payload = studentPreferencesSchema.parse(await req.json());
    const preferences = await updateStudentPreferences(student.id, payload);
    return jsonOk({ preferences });
  } catch (error) {
    return jsonError(error);
  }
}
