import { CheckCircle, Link2, Mail } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { getDemoDashboardSnapshot } from "@/lib/edu-schedule/dashboard-data";

export const dynamic = "force-dynamic";

export default async function EmailPage() {
  const data = await getDemoDashboardSnapshot();
  const history = data.emailHistory;
  const processedCount = history.filter((item) => item.status === "PROCESSED").length;
  const linkedToChanges = history.filter((item) => item.matchedChangeId).length;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">Email intake</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">Email processing history</h1>
        <p className="mt-1 text-sm text-slate-500">
          Locally persisted email scan results from the inbox pipeline. Run an inbox scan in the Timetable
          workspace to populate this view.
        </p>
      </div>

      {/* Stat cards */}
      <section aria-label="Email metrics" className="grid gap-3 md:grid-cols-3">
        <StatCard label="Saved logs" value={history.length} icon={Mail} accent="sky" />
        <StatCard label="Processed" value={processedCount} icon={CheckCircle} accent="emerald" />
        <StatCard label="Linked to changes" value={linkedToChanges} icon={Link2} accent="amber" />
      </section>

      {/* Email history */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Processing history</h2>
        <div className="mt-4 space-y-2">
          {history.length === 0 ? (
            <EmptyState
              label="No email scan history yet"
              hint="Use the Timetable workspace to trigger an inbox scan."
            />
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border-l-4 border-l-slate-300 border border-slate-100 bg-slate-50/60 px-4 py-3.5 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 leading-snug truncate">
                      {item.subject ?? "Untitled email"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {item.fromAddress ?? "Unknown sender"}
                      {item.receivedAt
                        ? ` · ${new Date(item.receivedAt).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    {item.matchedChangeId && (
                      <Badge variant="amber">Linked change</Badge>
                    )}
                  </div>
                </div>
                {item.summary && (
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{item.summary}</p>
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
