"use client";

import { useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  toolName?: string;
};

const quickPrompts = [
  "Show my schedule today",
  "What free time do I have tomorrow?",
  "Create a 90 minute study session tomorrow",
  "Undo last change",
] as const;

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Ask for today or tomorrow's schedule, free time, a study session, or to undo the last reversible change.",
    },
  ]);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { pushToast } = useToast();

  async function submitMessage(message: string) {
    if (!message.trim()) return;

    const nextUserMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: message.trim(),
    };

    setMessages((current) => [...current, nextUserMessage]);
    setInput("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error?.message ?? "Chat request failed");
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: result.data.reply,
          toolName: result.data.toolName,
        },
      ]);
    } catch (error) {
      pushToast({
        title: "Chat request failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Quick prompts</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
              onClick={() => submitMessage(prompt)}
              disabled={submitting}
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Local assistant</h2>
          <p className="mt-1 text-xs text-slate-500">
            Tool-dispatched and local-demo safe. No external model call is required for the supported commands.
          </p>
        </div>

        <div className="space-y-3 px-5 py-5">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
              <p className="text-sm font-medium text-slate-400">No messages yet</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                {message.role === "assistant" ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                    <Bot className="h-4 w-4" />
                  </span>
                ) : null}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    message.role === "assistant"
                      ? "bg-slate-100 text-slate-800"
                      : "bg-slate-900 text-white"
                  }`}
                >
                  {message.text}
                  {message.role === "assistant" && message.toolName ? (
                    <div className="mt-2">
                      <span className="inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        Tool: {message.toolName}
                      </span>
                    </div>
                  ) : null}
                </div>
                {message.role === "user" ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                    <User className="h-4 w-4" />
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>

        <form
          className="border-t border-slate-100 px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitMessage(input);
          }}
        >
          <div className="flex gap-2">
            <textarea
              className="min-h-20 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-500"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask for your schedule, free time, a study session, or an undo."
            />
            <Button type="submit" className="self-end" disabled={submitting || !input.trim()}>
              <Send className="h-4 w-4" />
              {submitting ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
