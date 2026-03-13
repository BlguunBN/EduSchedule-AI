"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { dashboardNavItems } from "@/components/dashboard/nav-items";
import { cn } from "@/lib/utils";

type Props = {
  displayName?: string;
  initials?: string;
};

export function DashboardSidebar({ displayName, initials }: Props) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen min-h-screen w-64 flex-none flex-col overflow-y-auto bg-slate-900 lg:flex">
      <div className="border-b border-slate-800 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white">
            <Zap className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">EduScheduleAI</p>
            <p className="text-xs text-slate-500">Student workspace</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Dashboard navigation">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
          Workspace
        </p>
        {dashboardNavItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sky-500/15 text-sky-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn("h-4 w-4 shrink-0", isActive ? "text-sky-400" : "text-slate-500")}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4">
        {displayName ? (
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-200">
              {initials}
            </span>
            <p className="truncate text-xs font-medium text-slate-400">{displayName}</p>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <p className="text-xs text-slate-600">Demo mode · local data</p>
        </div>
      </div>
    </aside>
  );
}
