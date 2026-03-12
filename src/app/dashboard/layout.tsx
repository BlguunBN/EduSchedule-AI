import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { getDevBypassSession, isDevAuthBypassEnabled } from "@/lib/dev-auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = isDevAuthBypassEnabled() ? getDevBypassSession() : await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const displayName = session.user.name ?? session.user.email ?? "Student";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Fixed dark sidebar */}
      <DashboardSidebar displayName={displayName} initials={initials} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div />
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2.5 mr-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {initials}
              </span>
              <div className="leading-none">
                <p className="text-sm font-medium text-slate-900">{displayName}</p>
                <p className="text-xs text-slate-400">Student</p>
              </div>
            </div>
            <SignOutButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
