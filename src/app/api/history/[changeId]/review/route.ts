import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { requireCurrentStudent } from "@/lib/edu-schedule/current-student";
import { reviewDetectedEmailChange } from "@/lib/edu-schedule/email-review";

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "DISMISS"]),
});

type RouteContext = {
  params: Promise<{ changeId: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { student } = await requireCurrentStudent();
    const payload = reviewSchema.parse(await req.json());
    const { changeId } = await context.params;

    const result = await reviewDetectedEmailChange({
      studentId: student.id,
      changeId,
      action: payload.action,
    });

    return jsonOk({ review: result });
  } catch (error) {
    return jsonError(error);
  }
}
