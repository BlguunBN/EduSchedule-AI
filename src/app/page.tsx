import Link from "next/link";
import { ArrowRight, CalendarClock, Mail, ShieldCheck, Zap } from "lucide-react";
import { SignInButton } from "@/components/auth/sign-in-button";
import { Button } from "@/components/ui/button";

const pillars = [
  {
    title: "University auth",
    description: "Sign in with your university Microsoft account. Access is scoped to campus workflows only.",
    icon: ShieldCheck,
    accent: "sky",
  },
  {
    title: "Timetable ingestion",
    description: "Normalize class schedules into one source of truth — room, instructor, and week patterns included.",
    icon: CalendarClock,
    accent: "violet",
  },
  {
    title: "Email change detection",
    description: "Capture inbox notices, detect schedule changes, and sync only what actually matters.",
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

export default function LandingPage() {
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
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Dashboard
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
            Day 3 prototype · local demo ready
          </div>
          <h1 className="mt-8 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-tight">
            Your academic calendar,{" "}
            <span className="text-sky-600">cleaned up</span>{" "}
            before chaos hits.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-500">
            EduScheduleAI helps students keep their Outlook calendar aligned with class timetables,
            room changes, cancellations, and ad-hoc academic emails.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <SignInButton />
            <Link href="/dashboard">
              <Button variant="outline">
                Preview dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
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
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">In this build</p>
          <ul className="mt-4 grid gap-2.5 text-sm text-slate-600 sm:grid-cols-2">
            {[
              "Prisma models for users, students, timetables, and change tracking",
              "NextAuth v5 with Microsoft provider placeholders",
              "Protected dashboard with local demo auth bypass",
              "Timetable workspace with CSV/ICS import sandbox",
              "Email inbox scan with AI classification",
              "Schedule change detection and review feed",
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
          <p className="text-xs text-slate-400">EduScheduleAI · Student prototype · Local data only</p>
        </div>
      </footer>
    </div>
  );
}
