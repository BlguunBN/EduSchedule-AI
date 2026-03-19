/**
 * logger.ts — Minimal structured logger for server-side use.
 *
 * Outputs JSON lines to stdout/stderr so logs are parseable in production.
 * In development it pretty-prints for readability.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("reminder.sent", { reminderId: "...", studentId: "..." });
 *   logger.error("graph.fetch_failed", { code: "GRAPH_TOKEN_EXPIRED" }, error);
 */

const IS_DEV = process.env.NODE_ENV !== "production";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEntry = {
  ts: string;
  level: LogLevel;
  event: string;
  [key: string]: unknown;
};

// In-process metrics counters (resets on cold start — good enough for MVP observability).
const _counters: Record<string, number> = {};

export const metrics = {
  increment(name: string, by = 1) {
    _counters[name] = (_counters[name] ?? 0) + by;
  },
  snapshot(): Record<string, number> {
    return { ..._counters };
  },
  get(name: string): number {
    return _counters[name] ?? 0;
  },
};

function write(level: LogLevel, event: string, fields?: Record<string, unknown>, err?: unknown) {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  };

  if (err instanceof Error) {
    entry.errorMessage = err.message;
    entry.errorName = err.name;
    if (IS_DEV && err.stack) {
      entry.stack = err.stack;
    }
  } else if (err !== undefined) {
    entry.errorRaw = String(err);
  }

  const line = JSON.stringify(entry);

  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug(event: string, fields?: Record<string, unknown>) {
    if (IS_DEV) write("debug", event, fields);
  },
  info(event: string, fields?: Record<string, unknown>) {
    write("info", event, fields);
  },
  warn(event: string, fields?: Record<string, unknown>, err?: unknown) {
    write("warn", event, fields, err);
  },
  error(event: string, fields?: Record<string, unknown>, err?: unknown) {
    write("error", event, fields, err);
    metrics.increment(`error.${event}`);
  },
};
