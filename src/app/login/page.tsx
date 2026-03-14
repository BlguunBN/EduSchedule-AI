import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Zap } from "lucide-react";
import { auth } from "@/auth";
import { SignInButton } from "@/components/auth/sign-in-button";
import { Button } from "@/components/ui/button";
import { getMicrosoftAuthConfigStatus } from "@/lib/auth-config";
import { isDevAuthBypassEnabled } from "@/lib/dev-auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const bypassEnabled = isDevAuthBypassEnabled();
  const microsoft = getMicrosoftAuthConfigStatus();
  const session = bypassEnabled ? null : await auth();
  const params = (await searchParams) ?? {};

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
              : microsoft.configured
                ? "Use your university Microsoft account to access your student workspace."
                : "Microsoft sign-in is not configured yet for this local app instance."}
          </p>

          {!bypassEnabled && !microsoft.configured && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Outlook auth setup is incomplete</p>
                  <p className="mt-1">Missing or placeholder env keys: {microsoft.missing.join(", ")}</p>
                  <p className="mt-1">Add real Microsoft Entra app values in <code className="rounded bg-white px-1 py-0.5">.env</code>, then restart the dev server.</p>
                </div>
              </div>
            </div>
          )}

          {params.error && !bypassEnabled && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-left text-xs text-rose-800">
              <p className="font-semibold">Sign-in failed</p>
              <p className="mt-1">Error: {params.error}</p>
            </div>
          )}

          <div className="mt-6">
            {bypassEnabled ? (
              <Link href="/dashboard" className="block">
                <Button variant="primary" className="w-full h-10">
                  Enter demo dashboard
                </Button>
              </Link>
            ) : microsoft.configured ? (
              <SignInButton />
            ) : (
              <Button variant="primary" className="w-full h-10" disabled>
                Outlook sign-in unavailable
              </Button>
            )}
          </div>

          {!bypassEnabled && (
            <p className="mt-5 text-center text-xs text-slate-400">
              For local dev, set{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-600">
                NEXT_PUBLIC_DEV_AUTH_BYPASS=true
              </code>
              {" "}and{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-600">
                DEV_AUTH_BYPASS=true
              </code>
              .
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
