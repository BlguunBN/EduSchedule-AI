"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Link2, Mail, PlugZap, XCircle } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

type GraphStatus = {
  state: "NOT_CONFIGURED" | "READY_TO_CONNECT" | "CONNECTED";
  ready: boolean;
  connected: boolean;
  mode: "mock-only" | "ready" | "connected";
  missingEnv: string[];
  configuredEnv: string[];
  connectedAccountCount: number;
  message: string;
};

type ReviewItem = {
  id: string;
  title: string;
  status: string;
  details: string | null;
  detectedAt: string;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  subject: string;
  fromAddress: string | null;
  receivedAt: string | null;
  processingStatus: string | null;
};

type EmailHistoryItem = {
  id: string;
  subject: string | null;
  fromAddress: string | null;
  status: string;
  summary: string | null;
  matchedChangeId: string | null;
  receivedAt: string | null;
  createdAt: string;
};

export function EmailReviewPanel({
  initialReviewQueue,
  initialHistory,
  graphStatus,
}: {
  initialReviewQueue: ReviewItem[];
  initialHistory: EmailHistoryItem[];
  graphStatus: GraphStatus;
}) {
  const [reviewQueue, setReviewQueue] = useState(initialReviewQueue);
  const [history, setHistory] = useState(initialHistory);
  const [actingId, setActingId] = useState<string | null>(null);
  const { pushToast } = useToast();

  const metrics = useMemo(
    () => ({
      savedLogs: history.length,
      reviewRequired: reviewQueue.length,
      linkedToChanges: history.filter((item) => item.matchedChangeId).length,
    }),
    [history, reviewQueue],
  );

  async function submitReview(changeId: string, action: "APPROVE" | "DISMISS") {
    setActingId(changeId);

    try {
      const response = await fetch(`/api/history/${changeId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error?.message ?? "Failed to update review");
      }

      const review = result.data.review as { title: string };
      setReviewQueue((current) => current.filter((item) => item.id !== changeId));
      setHistory((current) =>
        current.map((item) =>
          item.matchedChangeId === changeId
            ? {
                ...item,
                status: action === "APPROVE" ? "APPROVED" : "DISMISSED",
              }
            : item,
        ),
      );

      pushToast({
        title: action === "APPROVE" ? "Change approved" : "Change dismissed",
        description: review.title,
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: "Review update failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "error",
      });
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Saved logs" value={metrics.savedLogs} icon={Mail} />
        <MetricCard label="Needs review" value={metrics.reviewRequired} icon={CircleAlert} />
        <MetricCard label="Linked changes" value={metrics.linkedToChanges} icon={Link2} />
        <MetricCard label="Graph accounts" value={graphStatus.connectedAccountCount} icon={PlugZap} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Microsoft Graph status</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{graphStatus.message}</p>
          </div>
          <Badge variant={statusVariant(graphStatus.state)}>{graphStatus.state}</Badge>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <StatusList
            label="Configured env"
            items={graphStatus.configuredEnv.length > 0 ? graphStatus.configuredEnv : ["None yet"]}
            tone="good"
          />
          <StatusList
            label="Missing env"
            items={graphStatus.missingEnv.length > 0 ? graphStatus.missingEnv : ["Nothing missing"]}
            tone={graphStatus.missingEnv.length > 0 ? "warn" : "good"}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Pending email-derived changes</h2>
            <p className="mt-1 text-xs text-slate-500">
              Review detected schedule items before they affect the local calendar.
            </p>
          </div>
          <Badge variant="sky">{reviewQueue.length} pending</Badge>
        </div>

        <div className="mt-4 space-y-3">
          {reviewQueue.length === 0 ? (
            <EmptyState
              label="No pending review items"
              hint="Run the mock inbox scan from the timetable workspace to create reviewable email changes."
            />
          ) : (
            reviewQueue.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{item.subject}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.fromAddress ?? "Unknown sender"}
                      {item.receivedAt ? ` · ${new Date(item.receivedAt).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    {item.processingStatus ? (
                      <Badge variant={statusVariant(item.processingStatus)}>{item.processingStatus}</Badge>
                    ) : null}
                  </div>
                </div>

                {item.details ? (
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{item.details}</p>
                ) : null}

                <p className="mt-3 text-xs text-slate-400">
                  Detected {new Date(item.detectedAt).toLocaleString()}
                  {item.effectiveFrom ? ` · Effective ${new Date(item.effectiveFrom).toLocaleString()}` : ""}
                </p>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={actingId === item.id}
                    onClick={() => submitReview(item.id, "DISMISS")}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {actingId === item.id ? "Saving..." : "Dismiss"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={actingId === item.id}
                    onClick={() => submitReview(item.id, "APPROVE")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {actingId === item.id ? "Saving..." : "Approve"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Processing history</h2>
        <div className="mt-4 space-y-2">
          {history.length === 0 ? (
            <EmptyState label="No email scan history yet" hint="Use the timetable workspace to trigger an inbox scan." />
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3.5 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium leading-snug text-slate-900">
                      {item.subject ?? "Untitled email"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {item.fromAddress ?? "Unknown sender"}
                      {item.receivedAt ? ` · ${new Date(item.receivedAt).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    {item.matchedChangeId ? <Badge variant="amber">Linked change</Badge> : null}
                  </div>
                </div>
                {item.summary ? (
                  <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">{item.summary}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Mail;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusList({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "good" | "warn";
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant={tone === "good" ? "emerald" : "amber"}>
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-12 text-center">
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="mt-1.5 max-w-xs text-xs text-slate-300">{hint}</p>
    </div>
  );
}
