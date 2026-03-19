"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

type Step = {
  id: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
};

export function GettingStartedChecklist({
  hasTimetable,
  hasCalendarEvents,
  hasEmailScan,
  hasReminders,
}: {
  hasTimetable: boolean;
  hasCalendarEvents: boolean;
  hasEmailScan: boolean;
  hasReminders: boolean;
}) {
  const steps: Step[] = [
    {
      id: "timetable",
      label: "Add your timetable",
      hint: "Upload a CSV or ICS file with your class schedule.",
      href: "/dashboard/timetable",
      done: hasTimetable,
    },
    {
      id: "calendar",
      label: "Generate calendar events",
      hint: "Save your timetable to create calendar entries.",
      href: "/dashboard/calendar",
      done: hasCalendarEvents,
    },
    {
      id: "email",
      label: "Scan your inbox",
      hint: "Connect Outlook to detect room changes and cancellations.",
      href: "/dashboard/email",
      done: hasEmailScan,
    },
    {
      id: "reminders",
      label: "Set up reminders",
      hint: "Sync reminders to get notified before exams and deadlines.",
      href: "/dashboard/reminders",
      done: hasReminders,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  if (doneCount === steps.length) return null;

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-sky-900">Getting started</p>
          <p className="mt-0.5 text-xs text-sky-700">
            {doneCount} of {steps.length} steps complete
          </p>
        </div>
        <div className="flex gap-1">
          {steps.map((step) => (
            <span
              key={step.id}
              className={`h-1.5 w-6 rounded-full ${step.done ? "bg-sky-500" : "bg-sky-200"}`}
            />
          ))}
        </div>
      </div>
      <ol className="mt-4 space-y-2">
        {steps.map((step, index) => (
          <li key={step.id}>
            <Link
              href={step.done ? "#" : step.href}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors duration-150 ${
                step.done
                  ? "border-sky-100 bg-white/60 opacity-60 cursor-default"
                  : "cursor-pointer border-sky-200 bg-white hover:border-sky-300 hover:bg-sky-50/80"
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
              )}
              <div className="min-w-0">
                <p className={`font-medium ${step.done ? "text-slate-400 line-through" : "text-slate-900"}`}>
                  {index + 1}. {step.label}
                </p>
                {!step.done && (
                  <p className="mt-0.5 text-xs text-slate-500">{step.hint}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
