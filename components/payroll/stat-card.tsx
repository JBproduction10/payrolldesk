import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  iconClassName,
  trend,
  trendTone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  iconClassName?: string;
  trend?: ReactNode;
  trendTone?: "up" | "down" | "neutral";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground",
              iconClassName,
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 font-heading text-3xl font-semibold text-foreground">
        {value}
      </div>
      {trend && (
        <div
          className={cn(
            "mt-2 flex items-center gap-1 text-xs font-medium",
            trendTone === "up" && "text-success",
            trendTone === "down" && "text-destructive",
            trendTone === "neutral" && "text-muted-foreground",
          )}
        >
          {trend}
        </div>
      )}
    </div>
  );
}
