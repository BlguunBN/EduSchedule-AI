"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNavItems } from "@/components/dashboard/nav-items";
import { cn } from "@/lib/utils";

// Show only the 5 most-used nav items on mobile to keep touch targets ≥44px
const MOBILE_NAV_ITEMS = dashboardNavItems.slice(0, 5);

export function DashboardMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile dashboard navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 py-1 backdrop-blur lg:hidden"
    >
      <div className="grid grid-cols-5 gap-1">
        {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[44px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors",
                isActive
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-sky-600")} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
