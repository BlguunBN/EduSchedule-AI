export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Page header */}
      <div>
        <div className="h-3 w-16 rounded bg-slate-200" />
        <div className="mt-2 h-7 w-56 rounded-lg bg-slate-200" />
        <div className="mt-2 h-4 w-80 rounded bg-slate-200" />
      </div>

      {/* Stat cards row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm border-l-4 border-l-slate-200"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="h-6 w-6 rounded-md bg-slate-200" />
            </div>
            <div className="mt-3 h-8 w-12 rounded bg-slate-200" />
            <div className="mt-1 h-3 w-20 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="h-3 w-48 rounded bg-slate-200" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 w-28 rounded-lg bg-slate-100" />
            ))}
          </div>
        </div>
      </div>

      {/* Three-column cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-4 w-28 rounded bg-slate-200" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-4 w-full rounded bg-slate-100" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom two-column */}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-11 w-full rounded-lg bg-slate-100" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-4 w-36 rounded bg-slate-200" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 w-full rounded bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
