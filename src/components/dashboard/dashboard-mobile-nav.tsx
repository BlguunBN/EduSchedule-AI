"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNavItems } from "@/components/dashboard/nav-items";
import { cn } from "@/lib/utils";

export function DashboardMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile dashboard navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur lg:hidden"
    >
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${dashboardNavItems.length}, minmax(0, 1fr))` }}
      >
        {dashboardNavItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium",
                isActive ? "bg-sky-50 text-sky-700" : "text-slate-500",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
