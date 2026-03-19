import { jsonError, jsonOk } from "@/lib/api";
import { requireCurrentStudent } from "@/lib/edu-schedule/current-student";
import { listStudentHistory } from "@/lib/edu-schedule/history";

export async function GET() {
  try {
    const { student } = await requireCurrentStudent();
    const history = await listStudentHistory(student.id);
    return jsonOk({ history });
  } catch (error) {
    return jsonError(error);
  }
}
