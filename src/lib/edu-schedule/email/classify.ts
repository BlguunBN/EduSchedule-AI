import type { EmailCategory, EmailMessage, EmailPriority } from "@/lib/edu-schedule/types";

export function classifyEmail(message: EmailMessage): { category: EmailCategory; priority: EmailPriority } {
  const haystack = `${message.subject} ${message.bodyText}`.toLowerCase();

  const priority: EmailPriority = /(due|deadline|invoice|required|urgent|tomorrow|as soon as possible|asap|respond to our|please respond)/.test(haystack)
    ? "HIGH"
    : /(reminder|moved|register|submit|respond|invitation)/.test(haystack)
      ? "MEDIUM"
      : "LOW";

  if (/(assignment|slides|project|course|lecture|presentation)/.test(haystack)) {
    return { category: "COURSEWORK", priority };
  }
  if (/(schedule|moved|meeting|appointment|interview|invitation|room\s*:|time\s*:|department interview|friday|monday|tuesday|wednesday|thursday|january|february|march|april|may|june|july|august|september|october|november|december)/.test(haystack)) {
    return { category: "SCHEDULING", priority };
  }
  if (/(invoice|billing|office|tuition|registration)/.test(haystack)) {
    return { category: "ADMIN", priority };
  }
  if (/(club|social|hangout|party|event)/.test(haystack)) {
    return { category: "SOCIAL", priority };
  }
  return { category: "OTHER", priority };
}
