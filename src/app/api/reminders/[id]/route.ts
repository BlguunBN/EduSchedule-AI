import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, jsonError, jsonOk } from "@/lib/api";
import { requireCurrentStudent } from "@/lib/edu-schedule/current-student";
import { dismissReminder } from "@/lib/edu-schedule/reminders";

const patchSchema = z.object({
  status: z.enum(["DISMISSED"]),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * PATCH /api/reminders/:id
 * Dismiss a reminder.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { student } = await requireCurrentStudent();
    const { id } = await context.params;
    const payload = patchSchema.parse(await req.json());

    if (payload.status === "DISMISSED") {
      const updated = await dismissReminder(student.id, id);
      if (!updated) {
        throw new ApiError(404, "NOT_FOUND", "Reminder not found");
      }
      return jsonOk({ id: updated.id, status: updated.status });
    }

    throw new ApiError(400, "INVALID_STATUS", "Only DISMISSED status is supported");
  } catch (error) {
    return jsonError(error);
  }
}
