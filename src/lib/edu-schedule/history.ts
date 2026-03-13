import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseHistoryPayload } from "@/lib/edu-schedule/calendar";
import { restoreStudentStateSnapshot } from "@/lib/edu-schedule/state-snapshot";

type ListedHistoryItem = {
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

function canUndoChange(status: string, payload: ReturnType<typeof parseHistoryPayload>) {
  if (!payload) return false;
  if (payload.action === "CREATE_EVENT") return status === "APPLIED";
  if (payload.action === "REVIEW_APPROVE") return status === "APPLIED";
  if (payload.action === "REVIEW_DISMISS") return status === "DISMISSED";
  return false;
}

export async function listStudentHistory(studentId: string): Promise<ListedHistoryItem[]> {
  const changes = await prisma.scheduleChange.findMany({
    where: { studentId },
    orderBy: [{ detectedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return changes.map((change) => {
    const payload = parseHistoryPayload(change.rawPayload);
    const canUndo = canUndoChange(change.status, payload);

    return {
      id: change.id,
      title: change.title,
      changeType: change.changeType,
      source: change.source,
      status: change.status,
      details: change.details ?? undefined,
      effectiveFrom: change.effectiveFrom?.toISOString(),
      effectiveUntil: change.effectiveUntil?.toISOString(),
      detectedAt: change.detectedAt.toISOString(),
      processedAt: change.processedAt?.toISOString(),
      canUndo,
    };
  });
}

export async function undoScheduleChange(studentId: string, changeId: string) {
  const change = await prisma.scheduleChange.findFirst({
    where: { id: changeId, studentId },
  });

  if (!change) {
    throw new ApiError(404, "NOT_FOUND", "Schedule change not found");
  }

  const payload = parseHistoryPayload(change.rawPayload);
  if (!canUndoChange(change.status, payload)) {
    throw new ApiError(409, "NOT_REVERSIBLE", "This change cannot be undone");
  }

  if (payload?.snapshotBefore) {
    await restoreStudentStateSnapshot(studentId, payload.snapshotBefore);
  }

  const restoredAt = new Date().toISOString();
  let updated;

  if (payload?.action === "REVIEW_APPROVE" || payload?.action === "REVIEW_DISMISS") {
    updated = await prisma.scheduleChange.update({
      where: { id: change.id },
      data: {
        status: payload.previousStatus,
        processedAt: null,
        details: change.details
          ? `${change.details}\n\nRestored to review queue on ${restoredAt}.`
          : `Restored to review queue on ${restoredAt}.`,
      },
    });

    if (payload.linkedEmailLogId) {
      await prisma.emailProcessingLog.update({
        where: { id: payload.linkedEmailLogId },
        data: {
          processingStatus: payload.previousProcessingStatus,
        },
      });
    }
  } else {
    updated = await prisma.scheduleChange.update({
      where: { id: change.id },
      data: {
        status: "UNDONE",
        processedAt: new Date(),
        details: change.details
          ? `${change.details}\n\nUndone locally on ${restoredAt}.`
          : `Undone locally on ${restoredAt}.`,
      },
    });
  }

  return {
    id: updated.id,
    title: updated.title,
    status: updated.status,
    canUndo: canUndoChange(updated.status, parseHistoryPayload(updated.rawPayload)),
  };
}

export async function undoLastReversibleChange(studentId: string) {
  const changes = await prisma.scheduleChange.findMany({
    where: { studentId, status: { in: ["APPLIED", "DISMISSED"] } },
    orderBy: [{ detectedAt: "desc" }, { createdAt: "desc" }],
    take: 20,
  });

  const target = changes.find((change) => canUndoChange(change.status, parseHistoryPayload(change.rawPayload)));
  if (!target) {
    throw new ApiError(404, "NOT_FOUND", "No reversible change found");
  }

  return undoScheduleChange(studentId, target.id);
}
