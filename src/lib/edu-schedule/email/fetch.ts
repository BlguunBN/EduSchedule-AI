import { sampleEmailMessages } from "@/lib/edu-schedule/mock-data";
import type { EmailMessage } from "@/lib/edu-schedule/types";

export type EmailFetchOptions = {
  provider?: "mock" | "gmail" | "imap";
  limit?: number;
};

export async function fetchEmailMessages(options: EmailFetchOptions = {}): Promise<EmailMessage[]> {
  const provider = options.provider ?? "mock";
  const limit = options.limit ?? 10;

  if (provider !== "mock") {
    // TODO: implement real Gmail/IMAP adapters and secrets handling.
    return sampleEmailMessages.slice(0, limit);
  }

  return sampleEmailMessages.slice(0, limit);
}
