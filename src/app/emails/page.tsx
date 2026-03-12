import { Card } from "@/components/ui/card";
import { fetchEmailMessages } from "@/lib/edu-schedule/email/fetch";
import { classifyEmail } from "@/lib/edu-schedule/email/classify";
import { extractActionItems, extractDates, summarizeEmail } from "@/lib/edu-schedule/email/extract";

export default async function EmailsPage() {
  const messages = await fetchEmailMessages({ provider: "mock", limit: 10 });
  const cards = messages.map((message) => {
    const { category, priority } = classifyEmail(message);
    return {
      message,
      category,
      priority,
      summary: summarizeEmail(message),
      actionItems: extractActionItems(message),
      dates: extractDates(`${message.subject} ${message.bodyText}`),
    };
  });

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      <Card className="p-5">
        <h1 className="text-2xl font-bold text-slate-900">Email triage</h1>
        <p className="mt-1 text-sm text-slate-500">Rule-based inbox scan dashboard for coursework, scheduling, and admin reminders.</p>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[0.7fr,1.3fr]">
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-slate-900">Scan summary</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-lg border border-slate-200 p-3"><div className="text-sm text-slate-500">Messages</div><div className="text-2xl font-bold">{cards.length}</div></div>
            <div className="rounded-lg border border-slate-200 p-3"><div className="text-sm text-slate-500">High priority</div><div className="text-2xl font-bold">{cards.filter((card) => card.priority === "HIGH").length}</div></div>
            <div className="rounded-lg border border-slate-200 p-3"><div className="text-sm text-slate-500">With action items</div><div className="text-2xl font-bold">{cards.filter((card) => card.actionItems.length > 0).length}</div></div>
          </div>
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">API skeleton: <code>/api/emails/scan</code></div>
        </Card>

        <div className="space-y-3">
          {cards.map((card) => (
            <Card key={card.message.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-900">{card.message.subject}</h2>
                  <p className="text-sm text-slate-500">{card.message.from} · {new Date(card.message.receivedAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 text-xs font-medium">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{card.category}</span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900">{card.priority}</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-700">{card.summary}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-slate-900">Action items</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                    {card.actionItems.map((item) => <li key={`${card.message.id}-${item.label}`}>{item.label}{item.dueHint ? ` (${item.dueHint})` : ""}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">Date hints</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {card.dates.length > 0 ? card.dates.map((date) => <span key={`${card.message.id}-${date}`} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{date}</span>) : <span className="text-sm text-slate-400">No explicit date detected</span>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
