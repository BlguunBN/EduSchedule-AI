import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { ensureDemoStudent } from "@/lib/edu-schedule/demo-student";
import { fetchEmailMessages } from "@/lib/edu-schedule/email/fetch";
import { classifyEmail } from "@/lib/edu-schedule/email/classify";
import { extractActionItems, extractDates, extractLocations, summarizeEmail } from "@/lib/edu-schedule/email/extract";
import { getMicrosoftGraphStatus } from "@/lib/edu-schedule/graph";
import type { EmailMessage, EmailScanResult } from "@/lib/edu-schedule/types";

const emailMessageSchema = z.object({
  id: z.string(),
  subject: z.string(),
  from: z.string(),
  receivedAt: z.string().datetime(),
  bodyText: z.string(),
});

const scanSchema = z.object({
  provider: z.enum(["mock", "gmail", "imap", "microsoft-graph"]).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  messages: z.array(emailMessageSchema).optional(),
  persistDetectedEvents: z.boolean().default(true),
});

function scanMessage(message: EmailMessage): EmailScanResult {
  const { category, priority } = classifyEmail(message);
  return {
    message,
    category,
    priority,
    summary: summarizeEmail(message),
    actionItems: extractActionItems(message),
    extractedDates: extractDates(`${message.subject} ${message.bodyText}`),
    extractedLocations: extractLocations(message.bodyText),
  };
}

function coerceEffectiveDate(candidate: string | undefined, fallbackIso: string) {
  if (!candidate) return new Date(fallbackIso);

  const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/;
  const isoDateTime = /^\d{4}-\d{2}-\d{2}T/;

  if (isoDateOnly.test(candidate)) {
    return new Date(`${candidate}T09:00:00.000Z`);
  }

  if (isoDateTime.test(candidate)) {
    return new Date(candidate);
  }

  return new Date(fallbackIso);
}

async function persistScan(studentId: string, provider: string, results: EmailScanResult[]) {
  for (const result of results) {
    const providerName = provider.toUpperCase();
    const existingLog = await prisma.emailProcessingLog.findUnique({
      where: {
        provider_messageId: {
          provider: providerName,
          messageId: result.message.id,
        },
      },
    });
    const requiresReview = result.category === "SCHEDULING" || result.priority === "HIGH";

    const log =
      existingLog
        ? await prisma.emailProcessingLog.update({
            where: { id: existingLog.id },
            data: {
              subject: result.message.subject,
              fromAddress: result.message.from,
              receivedAt: new Date(result.message.receivedAt),
              processingStatus:
                existingLog.processingStatus === "APPROVED" || existingLog.processingStatus === "DISMISSED"
                  ? existingLog.processingStatus
                  : requiresReview
                    ? "REVIEW_REQUIRED"
                    : "PROCESSED",
              summary: result.summary,
              rawPayload: JSON.stringify(result),
            },
          })
        : await prisma.emailProcessingLog.create({
            data: {
              studentId,
              provider: providerName,
              messageId: result.message.id,
              subject: result.message.subject,
              fromAddress: result.message.from,
              receivedAt: new Date(result.message.receivedAt),
              processingStatus: requiresReview ? "REVIEW_REQUIRED" : "PROCESSED",
              summary: result.summary,
              rawPayload: JSON.stringify(result),
            },
          });

    if (requiresReview && !log.matchedChangeId) {
      const firstDate = result.extractedDates[0];
      const effectiveFrom = coerceEffectiveDate(firstDate, result.message.receivedAt);
      const change = await prisma.scheduleChange.create({
        data: {
          studentId,
          changeType: "CREATE",
          source: "EMAIL",
          title: result.message.subject,
          details: result.summary,
          effectiveFrom,
          status: "DETECTED",
          rawPayload: JSON.stringify(result),
        },
      });

      await prisma.emailProcessingLog.update({
        where: { id: log.id },
        data: { matchedChangeId: change.id },
      });
    }
  }
}

async function getHistory(studentId: string) {
  const logs = await prisma.emailProcessingLog.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return logs.map((log) => ({
    id: log.id,
    subject: log.subject,
    fromAddress: log.fromAddress,
    receivedAt: log.receivedAt?.toISOString(),
    status: log.processingStatus,
    summary: log.summary,
    matchedChangeId: log.matchedChangeId,
    createdAt: log.createdAt.toISOString(),
  }));
}

export async function POST(req: NextRequest) {
  try {
    const student = await ensureDemoStudent();
    const payload = scanSchema.parse(await req.json().catch(() => ({})));
    const provider = payload.provider ?? "mock";
    const graphStatus = await getMicrosoftGraphStatus(student.userId);

    if (provider === "microsoft-graph" && !graphStatus.connected) {
      throw new ApiError(409, "GRAPH_NOT_READY", graphStatus.message, graphStatus);
    }

    if (provider === "microsoft-graph") {
      throw new ApiError(
        501,
        "GRAPH_NOT_IMPLEMENTED",
        "Microsoft Graph mail fetch is not enabled in this local demo yet. Keep using mock inbox review until live sync is implemented.",
        graphStatus,
      );
    }

    const messages = payload.messages ?? (await fetchEmailMessages({ provider, limit: payload.limit }));
    const results = messages.map(scanMessage);

    if (payload.persistDetectedEvents) {
      await persistScan(student.id, provider, results);
    }

    return jsonOk({
      provider,
      count: results.length,
      results,
      history: await getHistory(student.id),
      persisted: payload.persistDetectedEvents,
      graphStatus,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET() {
  try {
    const student = await ensureDemoStudent();
    const history = await getHistory(student.id);
    const messages = await fetchEmailMessages({ provider: "mock", limit: 10 });
    const graphStatus = await getMicrosoftGraphStatus(student.userId);
    return jsonOk({
      provider: "mock",
      count: messages.length,
      results: messages.map(scanMessage),
      history,
      graphStatus,
    });
  } catch (error) {
    return jsonError(error);
  }
}
