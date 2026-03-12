import Link from "next/link";
import { redirect } from "next/navigation";
import { Zap } from "lucide-react";
import { auth } from "@/auth";
import { SignInButton } from "@/components/auth/sign-in-button";
import { Button } from "@/components/ui/button";
import { isDevAuthBypassEnabled } from "@/lib/dev-auth";

export default async function LoginPage() {
  const bypassEnabled = isDevAuthBypassEnabled();
  const session = bypassEnabled ? null : await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-12">
      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Brand above card */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-sm">
            <Zap className="h-6 w-6" />
          </span>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">EduScheduleAI</p>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900">
              Sign in to your workspace
            </h1>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-center text-sm leading-6 text-slate-500">
            {bypassEnabled
              ? "Local demo mode is active. Open the dashboard directly to test the full flow without Microsoft sign-in."
              : "Use your university Microsoft account to access your student workspace."}
          </p>

          <div className="mt-6">
            {bypassEnabled ? (
              <Link href="/dashboard" className="block">
                <Button variant="primary" className="w-full h-10">
                  Enter demo dashboard
                </Button>
              </Link>
            ) : (
              <SignInButton />
            )}
          </div>

          {!bypassEnabled && (
            <p className="mt-5 text-center text-xs text-slate-400">
              For local dev, set{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-600">
                NEXT_PUBLIC_DEV_AUTH_BYPASS=true
              </code>
            </p>
          )}
        </div>

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-slate-600 hover:underline underline-offset-2 transition-colors"
          >
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
