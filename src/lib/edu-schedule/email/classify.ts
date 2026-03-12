import type { EmailCategory, EmailMessage, EmailPriority } from "@/lib/edu-schedule/types";

export function classifyEmail(message: EmailMessage): { category: EmailCategory; priority: EmailPriority } {
  const haystack = `${message.subject} ${message.bodyText}`.toLowerCase();

  const priority: EmailPriority = /(due|deadline|invoice|required|urgent|tomorrow)/.test(haystack) ? "HIGH" : /(reminder|moved|register|submit)/.test(haystack) ? "MEDIUM" : "LOW";

  if (/(assignment|slides|project|course|lecture|presentation)/.test(haystack)) {
    return { category: "COURSEWORK", priority };
  }
  if (/(schedule|moved|meeting|appointment|friday|monday|tuesday|wednesday|thursday)/.test(haystack)) {
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
