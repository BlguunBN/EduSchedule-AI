import { HistoryPanel } from "@/components/dashboard/history-panel";
import { ensureDemoStudent } from "@/lib/edu-schedule/demo-student";
import { listStudentHistory } from "@/lib/edu-schedule/history";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const student = await ensureDemoStudent();
  const history = await listStudentHistory(student.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">History</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
          Schedule change history
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Review detected changes, manual calendar additions, and reversible demo actions in one place.
        </p>
      </div>

      <HistoryPanel initialHistory={history} />
    </div>
  );
}
