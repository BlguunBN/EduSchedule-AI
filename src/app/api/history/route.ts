import { jsonError, jsonOk } from "@/lib/api";
import { ensureDemoStudent } from "@/lib/edu-schedule/demo-student";
import { listStudentHistory } from "@/lib/edu-schedule/history";

export async function GET() {
  try {
    const student = await ensureDemoStudent();
    const history = await listStudentHistory(student.id);
    return jsonOk({ history });
  } catch (error) {
    return jsonError(error);
  }
}
