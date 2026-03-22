import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const accentBorder: Record<string, string> = {
  slate: "border-l-slate-400",
  sky: "border-l-sky-500",
  emerald: "border-l-emerald-500",
  amber: "border-l-amber-500",
  violet: "border-l-violet-500",
  rose: "border-l-rose-500",
};

const accentIcon: Record<string, string> = {
  slate: "bg-slate-100 text-slate-500",
  sky: "bg-sky-100 text-sky-600",
  emerald: "bg-emerald-100 text-emerald-600",
  amber: "bg-amber-100 text-amber-600",
  violet: "bg-violet-100 text-violet-600",
  rose: "bg-rose-100 text-rose-600",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "slate",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  accent?: "slate" | "sky" | "emerald" | "amber" | "violet" | "rose";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm border-l-4 transition-shadow duration-150 hover:shadow-md",
        accentBorder[accent],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        {Icon && (
          <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", accentIcon[accent])}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
