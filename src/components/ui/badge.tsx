import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "sky" | "emerald" | "amber" | "red" | "violet";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700",
  sky: "bg-sky-100 text-sky-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  violet: "bg-violet-100 text-violet-700",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Map a status string to a Badge variant */
export function statusVariant(status: string): BadgeVariant {
  const s = status.toUpperCase();
  if (s === "APPLIED" || s === "PROCESSED" || s === "COMPLETED") return "emerald";
  if (s === "PENDING") return "sky";
  if (s === "DETECTED" || s === "WARNING") return "amber";
  if (s === "FAILED" || s === "ERROR") return "red";
  return "default";
}
