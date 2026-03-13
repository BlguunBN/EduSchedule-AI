"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

type HistoryItem = {
  id: string;
  title: string;
  changeType: string;
  source: string;
  status: string;
  details?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  detectedAt: string;
  processedAt?: string;
  canUndo: boolean;
};

export function HistoryPanel({ initialHistory }: { initialHistory: HistoryItem[] }) {
  const [history, setHistory] = useState(initialHistory);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const { pushToast } = useToast();

  const metrics = useMemo(() => {
    return {
      total: history.length,
      reversible: history.filter((item) => item.canUndo).length,
      undone: history.filter((item) => item.status === "UNDONE").length,
    };
  }, [history]);

  async function handleUndo(changeId: string) {
    setUndoingId(changeId);

    try {
      const response = await fetch(`/api/history/${changeId}/undo`, {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error?.message ?? "Failed to undo change");
      }

      setHistory((current) =>
        current.map((item) =>
          item.id === changeId
            ? {
                ...item,
                status: result.data.undone.status,
                canUndo: result.data.undone.canUndo ?? false,
              }
            : item,
        ),
      );
      pushToast({
        title: result.data.undone.status === "UNDONE" ? "Change undone" : "Change restored",
        description: result.data.undone.title,
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: "Undo failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "error",
      });
    } finally {
      setUndoingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Total changes" value={metrics.total} />
        <MetricCard label="Can undo" value={metrics.reversible} />
        <MetricCard label="Already undone" value={metrics.undone} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Change history</h2>
        <div className="mt-4 space-y-2">
          {history.length === 0 ? (
            <EmptyState
              label="No saved schedule changes"
              hint="Detected email changes, manual calendar additions, and chat-created study sessions will appear here."
            />
          ) : (
            history.map((change) => (
              <div
                key={change.id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{change.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Detected {new Date(change.detectedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={statusVariant(change.status)}>{change.status}</Badge>
                    <Badge variant="default">{change.changeType}</Badge>
                    <Badge variant="default">{change.source}</Badge>
                  </div>
                </div>

                {change.details ? (
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                    {change.details}
                  </p>
                ) : null}

                {(change.effectiveFrom || change.effectiveUntil) ? (
                  <p className="mt-3 text-xs text-slate-400">
                    Effective{" "}
                    {change.effectiveFrom ? new Date(change.effectiveFrom).toLocaleString() : "unknown"}
                    {change.effectiveUntil ? ` to ${new Date(change.effectiveUntil).toLocaleString()}` : ""}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
                  <p className="text-xs text-slate-400">
                    {change.canUndo
                      ? "Reversible local change"
                      : change.status === "DETECTED"
                        ? "Returned to review queue"
                        : change.status === "DISMISSED"
                          ? "Dismissed review item"
                      : change.status === "UNDONE"
                        ? "Already undone"
                        : "Not safely reversible in local demo mode"}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!change.canUndo || undoingId === change.id}
                    onClick={() => handleUndo(change.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {undoingId === change.id ? "Undoing..." : "Undo"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyState({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-xs text-slate-300">{hint}</p>
    </div>
  );
}
