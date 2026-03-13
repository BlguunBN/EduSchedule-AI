import { jsonError, jsonOk } from "@/lib/api";
import { ensureDemoStudent } from "@/lib/edu-schedule/demo-student";
import { undoScheduleChange } from "@/lib/edu-schedule/history";

type RouteContext = {
  params: Promise<{ changeId: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  try {
    const { changeId } = await context.params;
    const student = await ensureDemoStudent();
    const undone = await undoScheduleChange(student.id, changeId);
    return jsonOk({ undone });
  } catch (error) {
    return jsonError(error);
  }
}
