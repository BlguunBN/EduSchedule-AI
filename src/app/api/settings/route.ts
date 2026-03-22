import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { requireCurrentStudent } from "@/lib/edu-schedule/current-student";
import {
  getStudentPreferences,
  settingsPutSchema,
  studentPreferencesSchema,
  updateStudentPreferences,
  updateStudentSettingsBundle,
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
    const body = await req.json();

    if (
      body &&
      typeof body === "object" &&
      "preferences" in body &&
      "profile" in body &&
      body.preferences &&
      body.profile
    ) {
      const bundle = settingsPutSchema.parse(body);
      const result = await updateStudentSettingsBundle(
        student.id,
        bundle.preferences,
        bundle.profile,
      );
      return jsonOk(result);
    }

    const payload = studentPreferencesSchema.parse(body);
    const preferences = await updateStudentPreferences(student.id, payload);
    return jsonOk({ preferences });
  } catch (error) {
    return jsonError(error);
  }
}
