"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PortalNavItem<T extends string = string> {
  key: T;
  label: string;
  icon: LucideIcon;
  /** Optional trailing count/badge, e.g. a pending-items counter. */
  badge?: string | number;
}

/**
 * Vertical section nav for the portal role views (school admin, cashier,
 * finance, treasury, intendance) — replaces the old horizontal pill tab bar
 * with a sidebar, mirroring the super_admin dashboard's <Sidebar>. Scrolls
 * horizontally on narrow screens instead of collapsing, since the portal
 * has no hamburger/drawer of its own.
 */
export function PortalSectionNav<T extends string>({
  items,
  value,
  onChange,
}: {
  items: PortalNavItem<T>[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <nav
      className="mb-6 flex shrink-0 flex-row gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-2 lg:mb-0 lg:w-56 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-3"
      aria-label="Section"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors lg:shrink",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground/80 hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
            {item.badge != null && (
              <span
                className={cn(
                  "ml-auto rounded-full px-1.5 py-0.5 text-[11px] font-medium",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
