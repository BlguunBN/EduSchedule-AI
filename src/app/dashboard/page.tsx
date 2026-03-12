import Link from "next/link";
import { BookOpen, CalendarCheck, CalendarDays, Mail, TriangleAlert } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { getDemoDashboardSnapshot } from "@/lib/edu-schedule/dashboard-data";

export const dynamic = "force-dynamic";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function DashboardOverviewPage() {
  const data = await getDemoDashboardSnapshot();
  const nextEvent = data.upcomingEvents[0];
  const latestChange = data.recentChanges[0];
  const latestEmail = data.emailHistory[0];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">Overview</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
          Your schedule at a glance
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Timetables, calendar events, email changes, and pending reviews — all in one place.
        </p>
      </div>

      {/* Stat cards */}
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

      {/* Info cards row */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Student profile */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Student profile</h2>
          <dl className="mt-4 divide-y divide-slate-100">
            <ProfileRow label="Name" value={data.student.fullName} />
            <ProfileRow label="Student no." value={data.student.studentNumber} />
            <ProfileRow label="Program" value={data.student.degreeProgram ?? "Not set"} />
            <ProfileRow label="Timezone" value={data.student.timezone} />
          </dl>
        </div>

        {/* Next event */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Next event</h2>
          {nextEvent ? (
            <div className="mt-4">
              <p className="font-semibold text-slate-900 leading-snug">{nextEvent.title}</p>
              <p className="mt-1.5 text-sm text-slate-500">
                {new Date(nextEvent.startsAt).toLocaleString()} &rarr;{" "}
                {new Date(nextEvent.endsAt).toLocaleTimeString()}
              </p>
              {nextEvent.location && (
                <p className="mt-1 text-sm text-slate-400">{nextEvent.location}</p>
              )}
              <Badge variant="sky" className="mt-3">{nextEvent.source}</Badge>
            </div>
          ) : (
            <EmptyState label="No upcoming events" hint="Save a timetable to generate events." />
          )}
        </div>

        {/* Latest email */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Latest inbox activity</h2>
          {latestEmail ? (
            <div className="mt-4">
              <p className="font-semibold text-slate-900 leading-snug">
                {latestEmail.subject ?? "Untitled email"}
              </p>
              <p className="mt-1.5 text-sm text-slate-500">{latestEmail.fromAddress ?? "Unknown sender"}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {latestEmail.receivedAt
                  ? new Date(latestEmail.receivedAt).toLocaleString()
                  : "No received time"}
              </p>
              {latestEmail.summary && (
                <p className="mt-3 text-sm text-slate-600 line-clamp-2 leading-relaxed">{latestEmail.summary}</p>
              )}
            </div>
          ) : (
            <EmptyState label="No email scan history" hint="Run an inbox scan from the Timetable workspace." />
          )}
        </div>
      </section>

      {/* Timetable + Latest change */}
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Active timetable */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Active timetable</h2>
            <Link
              href="/dashboard/timetable"
              className="text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline underline-offset-2"
            >
              Open timetable &rarr;
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
                    <p className="font-medium text-slate-900 truncate">{entry.moduleName}</p>
                    <p className="text-xs text-slate-400">
                      {entry.startTime}–{entry.endTime}
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

        {/* Latest change */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Latest detected change</h2>
            <Link
              href="/dashboard/changes"
              className="text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline underline-offset-2"
            >
              Review changes &rarr;
            </Link>
          </div>
          {latestChange ? (
            <div className="mt-4">
              <p className="font-semibold text-slate-900 leading-snug">{latestChange.title}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant={statusVariant(latestChange.status)}>{latestChange.status}</Badge>
                <Badge variant="default">{latestChange.changeType}</Badge>
                <Badge variant="default">{latestChange.source}</Badge>
              </div>
              {latestChange.details && (
                <p className="mt-3 text-sm text-slate-600 line-clamp-3 leading-relaxed">{latestChange.details}</p>
              )}
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
      <dd className="font-medium text-slate-900 text-right">{value}</dd>
    </div>
  );
}

function EmptyState({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-7 text-center">
      <p className="text-sm font-medium text-slate-400">{label}</p>
      {hint && <p className="mt-1 text-xs text-slate-300">{hint}</p>}
    </div>
  );
}
