import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import {
  getDemoStudentPreferences,
  studentPreferencesSchema,
  updateDemoStudentPreferences,
} from "@/lib/edu-schedule/preferences";

export async function GET() {
  try {
    const { student, preferences } = await getDemoStudentPreferences();

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
    const payload = studentPreferencesSchema.parse(await req.json());
    const preferences = await updateDemoStudentPreferences(payload);
    return jsonOk({ preferences });
  } catch (error) {
    return jsonError(error);
  }
}
