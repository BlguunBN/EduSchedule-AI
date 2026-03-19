"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Something went wrong</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          We couldn&apos;t load this page. This is usually a temporary hiccup — try again or return to the overview.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Button type="button" variant="outline" onClick={() => window.location.assign("/dashboard")}>
            Go to overview
          </Button>
        </div>
      </div>
    </div>
  );
}
