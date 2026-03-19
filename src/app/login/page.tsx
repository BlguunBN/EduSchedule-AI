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
  const params = (await searchParams) ?? {};

  let session: { user?: unknown } | null = null;
  let sessionError = false;

  try {
    session = await auth();
  } catch (error) {
    sessionError = true;
    console.error("[login] auth() failed", error);
  }

  // Always redirect to dashboard when a real session exists — even in bypass mode.
  if (session?.user) {
    redirect("/dashboard");
  }

  // In bypass mode with no real session, go straight to dashboard as demo user.
  if (bypassEnabled && !session?.user) {
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
              Sign in to get started
            </h1>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-center text-sm leading-6 text-slate-500">
            {bypassEnabled
              ? microsoft.configured
                ? "Demo mode is available. You can use demo access or sign in with your Microsoft account."
                : "Demo mode is on — go straight to the dashboard, no Microsoft account needed."
              : microsoft.configured
                ? "Use your university Microsoft account. Sign-in takes about 10 seconds."
                : "Microsoft sign-in isn't set up for this instance yet."}
          </p>

          {!bypassEnabled && !microsoft.configured && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Microsoft sign-in not configured</p>
                  <p className="mt-1">Missing env keys: {microsoft.missing.join(", ")}</p>
                  <p className="mt-1">Add your Microsoft Entra app credentials to <code className="rounded bg-white px-1 py-0.5">.env</code> and restart the server.</p>
                </div>
              </div>
            </div>
          )}

          {sessionError && !bypassEnabled && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-left text-xs text-rose-800">
              <p className="font-semibold">Login is temporarily unavailable</p>
              <p className="mt-1">
                We couldn&apos;t read your sign-in session from the database. Check your database connection
                settings, then refresh this page.
              </p>
            </div>
          )}

          {params.error && !bypassEnabled && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-left text-xs text-rose-800">
              <p className="font-semibold">Couldn&apos;t sign you in</p>
              <p className="mt-1">
                {params.error === "OAuthSignin" || params.error === "OAuthCallback"
                  ? "Something went wrong with Microsoft sign-in. Please try again."
                  : params.error === "AccessDenied"
                    ? "Access was denied. Make sure you're using your university account."
                    : `Sign-in error: ${params.error}. Please try again or contact support.`}
              </p>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {microsoft.configured ? <SignInButton /> : (
              <Button variant="primary" className="w-full h-10" disabled>
                Outlook sign-in unavailable
              </Button>
            )}

            {bypassEnabled && (
              <Link href="/dashboard" className="block">
                <Button variant="outline" className="w-full h-10">
                  Enter demo dashboard
                </Button>
              </Link>
            )}
          </div>

          {process.env.NODE_ENV !== "production" && !bypassEnabled && (
            <p className="mt-5 text-center text-xs text-slate-400">
              For local dev, set{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-600">
                DEV_AUTH_BYPASS=true
              </code>
              {" "}in your <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-600">.env</code> file.
              This flag has no effect in production builds.
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
