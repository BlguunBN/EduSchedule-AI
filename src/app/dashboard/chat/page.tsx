import { ChatPanel } from "@/components/dashboard/chat-panel";

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">Chat</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
          Local schedule assistant
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Ask practical schedule questions, create a study session, or undo the last reversible change.
        </p>
      </div>

      <ChatPanel />
    </div>
  );
}
