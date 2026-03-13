import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createLocalEventWithHistory } from "@/lib/edu-schedule/calendar";
import { captureStudentStateSnapshot } from "@/lib/edu-schedule/state-snapshot";

export type EmailReviewAction = "APPROVE" | "DISMISS";

export async function reviewDetectedEmailChange(input: {
  studentId: string;
  changeId: string;
  action: EmailReviewAction;
}) {
  const change = await prisma.scheduleChange.findFirst({
    where: {
      id: input.changeId,
      studentId: input.studentId,
    },
  });

  if (!change) {
    throw new ApiError(404, "NOT_FOUND", "Detected change not found");
  }

  if (!["DETECTED", "PENDING"].includes(change.status)) {
    throw new ApiError(409, "INVALID_STATE", "Only pending review items can be approved or dismissed");
  }

  const log = await prisma.emailProcessingLog.findFirst({
    where: {
      studentId: input.studentId,
      matchedChangeId: change.id,
    },
  });

  const snapshotBefore = await captureStudentStateSnapshot(input.studentId);
  const previousStatus = change.status;
  const previousProcessingStatus = log?.processingStatus ?? "PROCESSED";

  if (input.action === "DISMISS") {
    const updated = await prisma.scheduleChange.update({
      where: { id: change.id },
      data: {
        status: "DISMISSED",
        processedAt: new Date(),
        rawPayload: JSON.stringify({
          action: "REVIEW_DISMISS",
          snapshotBefore,
          previousStatus,
          previousProcessingStatus,
          linkedEmailLogId: log?.id ?? null,
        }),
      },
    });

    if (log) {
      await prisma.emailProcessingLog.update({
        where: { id: log.id },
        data: {
          processingStatus: "DISMISSED",
        },
      });
    }

    return {
      id: updated.id,
      title: updated.title,
      status: updated.status,
      action: input.action,
      createdEvent: null,
    };
  }

  let createdEvent: Awaited<ReturnType<typeof createLocalEventWithHistory>> | null = null;

  if (change.effectiveFrom) {
    const startsAt = new Date(change.effectiveFrom);
    const endsAt =
      change.effectiveUntil && change.effectiveUntil > change.effectiveFrom
        ? new Date(change.effectiveUntil)
        : new Date(startsAt.getTime() + 60 * 60 * 1000);

    createdEvent = await createLocalEventWithHistory({
      studentId: input.studentId,
      title: change.title,
      description: change.details ?? "Approved from email review.",
      location: undefined,
      startsAt,
      endsAt,
      source: "EMAIL",
      historySource: "EMAIL_REVIEW",
      changeType: "EMAIL_APPROVAL_EVENT",
      provider: "LOCAL_EMAIL_REVIEW",
      snapshotBefore,
      recordHistory: false,
    });
  }

  const updated = await prisma.scheduleChange.update({
    where: { id: change.id },
    data: {
      status: "APPLIED",
      processedAt: new Date(),
      rawPayload: JSON.stringify({
        action: "REVIEW_APPROVE",
        snapshotBefore,
        previousStatus,
        previousProcessingStatus,
        createdEventId: createdEvent?.event.id ?? null,
        linkedEmailLogId: log?.id ?? null,
      }),
    },
  });

  if (log) {
    await prisma.emailProcessingLog.update({
      where: { id: log.id },
      data: {
        processingStatus: "APPROVED",
      },
    });
  }

  return {
    id: updated.id,
    title: updated.title,
    status: updated.status,
    action: input.action,
    createdEvent: createdEvent?.event ?? null,
  };
}
