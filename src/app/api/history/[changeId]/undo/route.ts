import { jsonError, jsonOk } from "@/lib/api";
import { requireCurrentStudent } from "@/lib/edu-schedule/current-student";
import { undoScheduleChange } from "@/lib/edu-schedule/history";

type RouteContext = {
  params: Promise<{ changeId: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  try {
    const { changeId } = await context.params;
    const { student } = await requireCurrentStudent();
    const undone = await undoScheduleChange(student.id, changeId);
    return jsonOk({ undone });
  } catch (error) {
    return jsonError(error);
  }
}
