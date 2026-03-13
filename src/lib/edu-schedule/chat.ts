import { findFreeSlots } from "@/lib/edu-schedule/scheduling";
import { createLocalEventWithHistory, getStudentCalendarEvents } from "@/lib/edu-schedule/calendar";
import { undoLastReversibleChange } from "@/lib/edu-schedule/history";
import type { StudentPreferencesInput } from "@/lib/edu-schedule/preferences";

type ChatIntent = "schedule" | "free_time" | "study_session" | "undo" | "settings" | "fallback";
type ChatToolName =
  | "scheduleToday"
  | "scheduleTomorrow"
  | "findFreeTime"
  | "createStudySession"
  | "undoLastChange"
  | "getSettings";

type ChatResult = {
  intent: ChatIntent;
  toolName?: ChatToolName;
  reply: string;
  data?: Record<string, unknown>;
};

function getDayRange(offsetDays = 0, startTime = "00:00", endTime = "23:59") {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + offsetDays);

  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  const start = new Date(base);
  start.setHours(startHours ?? 0, startMinutes ?? 0, 0, 0);

  const end = new Date(base);
  end.setHours(endHours ?? 23, endMinutes ?? 59, 59, 999);

  return { start, end };
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveDayOffset(message: string) {
  return message.includes("tomorrow") ? 1 : 0;
}

function resolveDuration(message: string, fallbackMinutes: number) {
  const match = message.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);
  if (!match) return fallbackMinutes;

  const value = Number(match[1]);
  const unit = match[2]?.toLowerCase() ?? "minutes";
  if (unit.startsWith("hour") || unit.startsWith("hr")) {
    return value * 60;
  }

  return value;
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getWeekendBlockedReply(label: string) {
  return `Weekend scheduling is currently disabled in your settings, so I won't place study time ${label}. Enable weekends in Settings if you want Saturday and Sunday suggestions.`;
}

function buildScheduleReply(label: string, events: Awaited<ReturnType<typeof getStudentCalendarEvents>>) {
  if (events.length === 0) {
    return `You have no scheduled items for ${label}.`;
  }

  const lines = events.map(
    (event) => `- ${formatTime(event.startsAt)} to ${formatTime(event.endsAt)}: ${event.title}${event.location ? ` (${event.location})` : ""}`,
  );

  return [`Here is your ${label} schedule:`, ...lines].join("\n");
}

function buildSettingsReply(preferences: StudentPreferencesInput) {
  return [
    "Current local scheduling settings:",
    `- Study session length: ${preferences.studySessionMinutes} minutes`,
    `- Minimum free slot: ${preferences.minimumFreeSlotMinutes} minutes`,
    `- Study window: ${preferences.preferredStudyStartTime} to ${preferences.preferredStudyEndTime}`,
    `- Preferred location: ${preferences.preferredStudyLocation ?? "Not set"}`,
    `- Include weekends: ${preferences.includeWeekends ? "Yes" : "No"}`,
  ].join("\n");
}

function resolveToolName(message: string): ChatToolName | null {
  if (message.includes("setting") || message.includes("preference")) return "getSettings";
  if (message.includes("undo")) return "undoLastChange";
  if (message.includes("study") || message.includes("focus")) return "createStudySession";
  if (message.includes("free") || message.includes("availability") || message.includes("open slot")) {
    return "findFreeTime";
  }
  if (message.includes("tomorrow")) return "scheduleTomorrow";
  if (message.includes("schedule") || message.includes("class") || message.includes("today")) return "scheduleToday";
  return null;
}

export async function runLocalChatCommand(input: {
  studentId: string;
  message: string;
  preferences: StudentPreferencesInput;
}) : Promise<ChatResult> {
  const normalized = input.message.toLowerCase();
  const toolName = resolveToolName(normalized);
  const dayOffset = resolveDayOffset(normalized);
  const dayLabel = dayOffset === 1 ? "tomorrow" : "today";

  if (toolName === "undoLastChange") {
    const undone = await undoLastReversibleChange(input.studentId);
    return {
      intent: "undo",
      toolName,
      reply: `Undid the last reversible change: ${undone.title}.`,
      data: undone,
    };
  }

  if (toolName === "getSettings") {
    return {
      intent: "settings",
      toolName,
      reply: buildSettingsReply(input.preferences),
      data: { preferences: input.preferences },
    };
  }

  if (toolName === "createStudySession") {
    const durationMinutes = resolveDuration(normalized, input.preferences.studySessionMinutes);
    const { start, end } = getDayRange(
      dayOffset,
      input.preferences.preferredStudyStartTime,
      input.preferences.preferredStudyEndTime,
    );

    if (!input.preferences.includeWeekends && isWeekend(start)) {
      return {
        intent: "study_session",
        reply: getWeekendBlockedReply(dayLabel),
        data: { freeSlots: [] },
      };
    }

    const events = await getStudentCalendarEvents(input.studentId, start, end);
    const freeSlots = findFreeSlots(events, {
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      minimumMinutes: Math.max(durationMinutes, input.preferences.minimumFreeSlotMinutes),
    });
    const slot = freeSlots[0];

    if (!slot) {
      return {
        intent: "study_session",
        reply: `I could not find a ${durationMinutes}-minute study slot ${dayLabel} inside your preferred study window.`,
        data: { freeSlots: [] },
      };
    }

    const sessionEnd = new Date(slot.startsAt);
    sessionEnd.setMinutes(sessionEnd.getMinutes() + durationMinutes);

    const created = await createLocalEventWithHistory({
      studentId: input.studentId,
      title: "Study Session",
      description: `Created from chat for ${dayLabel}.`,
      location: input.preferences.preferredStudyLocation ?? undefined,
      startsAt: new Date(slot.startsAt),
      endsAt: sessionEnd,
      source: "SYSTEM",
      historySource: "CHAT",
      changeType: "STUDY_SESSION",
      provider: "LOCAL_CHAT",
    });

    return {
      intent: "study_session",
      toolName,
      reply: `I created a ${durationMinutes}-minute study session for ${dayLabel}, ${formatDateTime(created.event.startsAt)} to ${formatTime(created.event.endsAt)}.`,
      data: created,
    };
  }

  if (toolName === "findFreeTime") {
    const { start, end } = getDayRange(
      dayOffset,
      input.preferences.preferredStudyStartTime,
      input.preferences.preferredStudyEndTime,
    );

    if (!input.preferences.includeWeekends && isWeekend(start)) {
      return {
        intent: "free_time",
        reply: getWeekendBlockedReply(dayLabel),
        data: { freeSlots: [] },
      };
    }

    const events = await getStudentCalendarEvents(input.studentId, start, end);
    const freeSlots = findFreeSlots(events, {
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      minimumMinutes: input.preferences.minimumFreeSlotMinutes,
    });

    if (freeSlots.length === 0) {
      return {
        intent: "free_time",
        reply: `I could not find free time ${dayLabel} that meets your ${input.preferences.minimumFreeSlotMinutes}-minute minimum.`,
        data: { freeSlots },
      };
    }

    const lines = freeSlots.slice(0, 4).map(
      (slot) => `- ${formatTime(slot.startsAt)} to ${formatTime(slot.endsAt)} (${slot.durationMinutes} min)`,
    );

    return {
      intent: "free_time",
      toolName,
      reply: [`Free time ${dayLabel}:`, ...lines].join("\n"),
      data: { freeSlots },
    };
  }

  if (toolName === "scheduleToday" || toolName === "scheduleTomorrow") {
    const requestedDayOffset = toolName === "scheduleTomorrow" ? 1 : 0;
    const { start, end } = getDayRange(requestedDayOffset);
    const requestedLabel = requestedDayOffset === 1 ? "tomorrow" : "today";
    const events = await getStudentCalendarEvents(input.studentId, start, end);
    return {
      intent: "schedule",
      toolName,
      reply: buildScheduleReply(requestedLabel, events),
      data: { events },
    };
  }

  return {
    intent: "fallback",
    data: {
      suggestions: [
        "Show my schedule today",
        "Show my schedule tomorrow",
        "What free time do I have tomorrow?",
        "Create a 90 minute study session tomorrow",
        "Show my settings",
        "Undo last change",
      ],
    },
    reply:
      "I can route local tools for scheduleToday, scheduleTomorrow, findFreeTime, createStudySession, undoLastChange, and getSettings. Try one of those requests explicitly.",
  };
}
