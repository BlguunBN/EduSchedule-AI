import { CheckCheck, Eye, Clock3 } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { getDemoDashboardSnapshot } from "@/lib/edu-schedule/dashboard-data";

export const dynamic = "force-dynamic";

const changeTypeBorderColor: Record<string, string> = {
  DETECTED: "border-l-amber-400",
  PENDING: "border-l-sky-400",
  APPLIED: "border-l-emerald-400",
  FAILED: "border-l-red-400",
};

export default async function ChangesPage() {
  const data = await getDemoDashboardSnapshot();
  const changes = data.recentChanges;
  const detectedCount = changes.filter((item) => item.status === "DETECTED").length;
  const pendingCount = changes.filter((item) => item.status === "PENDING").length;
  const appliedCount = changes.filter((item) => item.status === "APPLIED").length;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">Schedule changes</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">Detected changes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Email-derived changes and manual calendar edits are stored here for review.
          Apply or dismiss each change to keep your schedule accurate.
        </p>
      </div>

      {/* Stat cards */}
      <section aria-label="Change metrics" className="grid gap-3 md:grid-cols-3">
        <StatCard label="Detected" value={detectedCount} icon={Eye} accent="amber" />
        <StatCard label="Pending review" value={pendingCount} icon={Clock3} accent="sky" />
        <StatCard label="Applied" value={appliedCount} icon={CheckCheck} accent="emerald" />
      </section>

      {/* Changes list */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Recent change history</h2>
        <div className="mt-4 space-y-2">
          {changes.length === 0 ? (
            <EmptyState
              label="No schedule changes saved yet"
              hint="Changes will appear here once email parsing or manual edits detect schedule differences."
            />
          ) : (
            changes.map((change) => (
              <div
                key={change.id}
                className={`flex flex-col gap-2 rounded-lg border-l-4 border border-slate-100 bg-slate-50/60 px-4 py-3.5 text-sm ${changeTypeBorderColor[change.status] ?? "border-l-slate-300"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 leading-snug">{change.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Detected {new Date(change.detectedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <Badge variant={statusVariant(change.status)}>{change.status}</Badge>
                    <Badge variant="default">{change.changeType}</Badge>
                    <Badge variant="default">{change.source}</Badge>
                  </div>
                </div>

                {change.details && (
                  <p className="text-sm text-slate-600 leading-relaxed">{change.details}</p>
                )}

                {(change.effectiveFrom || change.effectiveUntil) && (
                  <p className="text-xs text-slate-400">
                    Effective:{" "}
                    {change.effectiveFrom
                      ? new Date(change.effectiveFrom).toLocaleString()
                      : "unknown"}
                    {change.effectiveUntil
                      ? ` → ${new Date(change.effectiveUntil).toLocaleString()}`
                      : ""}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-12 text-center">
      <p className="text-sm font-medium text-slate-400">{label}</p>
      {hint && <p className="mt-1.5 text-xs text-slate-300 max-w-xs">{hint}</p>}
    </div>
  );
}
