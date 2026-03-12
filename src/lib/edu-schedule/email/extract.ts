import type { EmailActionItem, EmailMessage } from "@/lib/edu-schedule/types";

const datePatterns = [
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
  /\b\d{1,2}:\d{2}\b/g,
];

export function extractDates(text: string) {
  const hits = new Set<string>();
  for (const pattern of datePatterns) {
    for (const match of text.match(pattern) ?? []) hits.add(match);
  }
  return [...hits];
}

export function extractLocations(text: string) {
  const matches = text.match(/\b(?:room|lab|building)\s+[a-z0-9-]+\b/gi) ?? [];
  return [...new Set(matches)];
}

export function extractActionItems(message: EmailMessage): EmailActionItem[] {
  const body = message.bodyText;
  const items: EmailActionItem[] = [];

  if (/upload|submit|send/i.test(body)) {
    items.push({ label: "Submit requested material", dueHint: extractDates(body)[0], confidence: 0.79 });
  }
  if (/register|registration/i.test(body)) {
    items.push({ label: "Complete registration", dueHint: extractDates(body)[0], confidence: 0.68 });
  }
  if (/invoice|tuition|payment/i.test(body)) {
    items.push({ label: "Review and pay invoice", dueHint: extractDates(body)[0], confidence: 0.83 });
  }

  if (items.length === 0) {
    items.push({ label: "Review email manually", confidence: 0.35 });
  }

  return items;
}

export function summarizeEmail(message: EmailMessage) {
  const compact = message.bodyText.replace(/\s+/g, " ").trim();
  return compact.length > 140 ? `${compact.slice(0, 137)}...` : compact;
}
