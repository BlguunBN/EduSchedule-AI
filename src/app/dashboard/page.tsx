import Link from "next/link";
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Download,
  Mail,
  MessageSquare,
  PlugZap,
  Settings,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { GettingStartedChecklist } from "@/components/dashboard/getting-started-checklist";
import { getDashboardSnapshot } from "@/lib/edu-schedule/dashboard-data";
import { requireCurrentStudent } from "@/lib/edu-schedule/current-student";

export const dynamic = "force-dynamic";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function DashboardOverviewPage() {
  const { student } = await requireCurrentStudent();
  const data = await getDashboardSnapshot(student.id);
  const nextEvent = data.upcomingEvents[0];
  const latestChange = data.recentChanges[0];
  const latestEmail = data.emailHistory[0];

  const hasTimetable = (data.activeTimetable?.entries.length ?? 0) > 0;
  const hasCalendarEvents = data.upcomingEvents.length > 0;
  const hasEmailScan = data.emailHistory.length > 0;
  const hasReminders = data.metrics.pendingChanges > 0 || data.metrics.processedEmails > 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">Overview</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
          Your schedule at a glance
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Timetables, calendar events, email changes, and reminders — all in one place.
        </p>
      </div>

      <GettingStartedChecklist
        hasTimetable={hasTimetable}
        hasCalendarEvents={hasCalendarEvents}
        hasEmailScan={hasEmailScan}
        hasReminders={hasReminders}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Quick actions</h2>
            <p className="mt-1 text-xs text-slate-500">
              Open the new chat, history, settings, or calendar export flows directly.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <QuickAction href="/dashboard/chat" icon={MessageSquare} label="Open chat" />
            <QuickAction href="/dashboard/history" icon={TriangleAlert} label="Review history" />
            <QuickAction href="/dashboard/email" icon={Mail} label="Review email" />
            <QuickAction href="/dashboard/settings" icon={Settings} label="Edit settings" />
            <QuickAction href="/api/calendar/events/ics" icon={Download} label="Export ICS" />
          </div>
        </div>
      </section>

      <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Active timetables"
          value={data.metrics.activeTimetables}
          icon={CalendarDays}
          accent="sky"
        />
        <StatCard
          label="Classes"
          value={data.metrics.timetableEntries}
          hint="In active timetable"
          icon={BookOpen}
          accent="violet"
        />
        <StatCard
          label="Upcoming events"
          value={data.metrics.upcomingEvents}
          hint="Future calendar entries"
          icon={CalendarCheck}
          accent="emerald"
        />
        <StatCard
          label="Pending changes"
          value={data.metrics.pendingChanges}
          hint="Awaiting review"
          icon={TriangleAlert}
          accent="amber"
        />
        <StatCard
          label="Emails processed"
          value={data.metrics.processedEmails}
          hint="Inbox scan history"
          icon={Mail}
          accent="slate"
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Microsoft Graph readiness</h2>
            <p className="mt-1 text-xs text-slate-500">{data.graphStatus.message}</p>
          </div>
          <div className="flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-slate-400" />
            <Badge variant={statusVariant(data.graphStatus.state)}>{data.graphStatus.state}</Badge>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Student profile</h2>
          <dl className="mt-4 divide-y divide-slate-100">
            <ProfileRow label="Name" value={data.student.fullName} />
            <ProfileRow label="Student no." value={data.student.studentNumber} />
            <ProfileRow label="Program" value={data.student.degreeProgram ?? "Not set"} />
            <ProfileRow label="Timezone" value={data.student.timezone} />
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Next event</h2>
          {nextEvent ? (
            <div className="mt-4">
              <p className="font-semibold leading-snug text-slate-900">{nextEvent.title}</p>
              <p className="mt-1.5 text-sm text-slate-500">
                {new Date(nextEvent.startsAt).toLocaleString()} to{" "}
                {new Date(nextEvent.endsAt).toLocaleTimeString()}
              </p>
              {nextEvent.location ? (
                <p className="mt-1 text-sm text-slate-400">{nextEvent.location}</p>
              ) : null}
              <Badge variant="sky" className="mt-3">
                {nextEvent.source}
              </Badge>
            </div>
          ) : (
            <EmptyState label="No upcoming events" hint="Save a timetable to generate events." />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Latest inbox activity</h2>
          {latestEmail ? (
            <div className="mt-4">
              <p className="font-semibold leading-snug text-slate-900">
                {latestEmail.subject ?? "Untitled email"}
              </p>
              <p className="mt-1.5 text-sm text-slate-500">
                {latestEmail.fromAddress ?? "Unknown sender"}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {latestEmail.receivedAt
                  ? new Date(latestEmail.receivedAt).toLocaleString()
                  : "No received time"}
              </p>
              {latestEmail.summary ? (
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
                  {latestEmail.summary}
                </p>
              ) : null}
            </div>
          ) : (
            <EmptyState
              label="No email scan history"
              hint="Run an inbox scan from the Timetable workspace."
            />
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Active timetable</h2>
            <Link
              href="/dashboard/timetable"
              className="text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline underline-offset-2"
            >
              Open timetable →
            </Link>
          </div>
          <div className="mt-4 space-y-1.5">
            {data.activeTimetable?.entries.length ? (
              data.activeTimetable.entries.slice(0, 6).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 text-sm"
                >
                  <span className="flex h-6 w-9 shrink-0 items-center justify-center rounded bg-sky-100 text-[11px] font-semibold text-sky-700">
                    {DAY_NAMES[entry.dayOfWeek] ?? `D${entry.dayOfWeek}`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{entry.moduleName}</p>
                    <p className="text-xs text-slate-400">
                      {entry.startTime}-{entry.endTime}
                      {entry.location ? ` · ${entry.location}` : ""}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState label="No timetable entries" hint="Add classes in the Timetable workspace." />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Latest detected change</h2>
            <Link
              href="/dashboard/history"
              className="text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline underline-offset-2"
            >
              Review history →
            </Link>
          </div>
          {latestChange ? (
            <div className="mt-4">
              <p className="font-semibold leading-snug text-slate-900">{latestChange.title}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant={statusVariant(latestChange.status)}>{latestChange.status}</Badge>
                <Badge variant="default">{latestChange.changeType}</Badge>
                <Badge variant="default">{latestChange.source}</Badge>
              </div>
              {latestChange.details ? (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
                  {latestChange.details}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-slate-400">
                Detected {new Date(latestChange.detectedAt).toLocaleString()}
              </p>
            </div>
          ) : (
            <EmptyState label="No detected changes" hint="Changes appear here once email parsing runs." />
          )}
        </div>
      </section>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function EmptyState({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-7 text-center">
      <p className="text-sm font-medium text-slate-400">{label}</p>
      {hint ? <p className="mt-1 text-xs text-slate-300">{hint}</p> : null}
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
