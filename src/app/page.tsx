import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isDevAuthBypassEnabled } from "@/lib/dev-auth";
import Link from "next/link";
import { ArrowRight, CalendarClock, Mail, ShieldCheck, Zap } from "lucide-react";
import { SignInButton } from "@/components/auth/sign-in-button";
import { Button } from "@/components/ui/button";

const pillars = [
  {
    title: "Sign in with Microsoft",
    description: "Use your university account — no extra password needed. Your data stays private to you.",
    icon: ShieldCheck,
    accent: "sky",
  },
  {
    title: "One timetable, always current",
    description: "Upload your class schedule once. Room changes and cancellations update it automatically.",
    icon: CalendarClock,
    accent: "violet",
  },
  {
    title: "Inbox-aware schedule sync",
    description: "We read relevant academic emails and flag changes for you to approve before anything updates.",
    icon: Mail,
    accent: "emerald",
  },
] as const;

const accentIcon: Record<string, string> = {
  sky: "bg-sky-100 text-sky-600",
  violet: "bg-violet-100 text-violet-600",
  emerald: "bg-emerald-100 text-emerald-600",
};

const accentBorder: Record<string, string> = {
  sky: "border-l-sky-400",
  violet: "border-l-violet-400",
  emerald: "border-l-emerald-400",
};

export default async function HomePage() {
  // Redirect already-authenticated users straight to the dashboard.
  const session = isDevAuthBypassEnabled() ? true : await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 sm:px-10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white">
              <Zap className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-slate-900">EduScheduleAI</span>
          </div>
          <Link href="/login">
            <Button variant="outline" size="sm">
              Sign in
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 sm:px-10">
        {/* Hero */}
        <section className="pb-20 pt-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Beta · invite-only
          </div>
          <h1 className="mt-8 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-tight">
            Your academic calendar,{" "}
            <span className="text-sky-600">always up to date</span>{" "}
            — without the manual work.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-500">
            EduScheduleAI keeps your class schedule in sync with room changes,
            cancellations, and deadline emails — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <SignInButton />
          </div>
        </section>

        {/* Feature pillars */}
        <section className="pb-12 grid gap-4 sm:grid-cols-3" aria-label="Features">
          {pillars.map(({ title, description, icon: Icon, accent }) => (
            <div
              key={title}
              className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 ${accentBorder[accent]}`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentIcon[accent]}`}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-slate-900">{title}</h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
            </div>
          ))}
        </section>

        {/* What ships */}
        <section className="mb-20 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">What you can do</p>
          <ul className="mt-4 grid gap-2.5 text-sm text-slate-600 sm:grid-cols-2">
            {[
              "Sign in with your university Microsoft account",
              "Import your timetable via CSV or ICS file",
              "Scan your Outlook inbox for schedule change emails",
              "Review and approve detected changes before they affect your calendar",
              "Get reminders before deadlines and exams",
              "Export your schedule as an ICS file to any calendar app",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6">
        <div className="mx-auto max-w-5xl px-6 sm:px-10">
          <p className="text-xs text-slate-400">EduScheduleAI · Beta · Your data is stored locally and never shared</p>
        </div>
      </footer>
    </div>
  );
}
