import { EmailReviewPanel } from "@/components/dashboard/email-review-panel";
import { getDemoDashboardSnapshot } from "@/lib/edu-schedule/dashboard-data";

export const dynamic = "force-dynamic";

export default async function EmailPage() {
  const data = await getDemoDashboardSnapshot();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">Email intake</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">Email review and processing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review email-derived changes before they affect the local calendar, and inspect Microsoft Graph readiness without leaving demo-safe mode.
        </p>
      </div>

      <EmailReviewPanel
        initialReviewQueue={data.reviewQueue}
        initialHistory={data.emailHistory}
        graphStatus={data.graphStatus}
      />
    </div>
  );
}
