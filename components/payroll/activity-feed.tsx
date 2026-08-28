"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  FileText,
  UserPlus,
  Building2,
  Send,
  SlidersHorizontal,
  Landmark,
  OctagonX,
  GraduationCap,
  Wallet,
  Receipt,
  UserCog,
  Banknote,
  PackageSearch,
} from "lucide-react";
import type { LogEntry } from "@/lib/types";
import { timeAgo } from "@/lib/format";

const ICONS: Record<LogEntry["kind"], typeof FileText> = {
  generate: FileText,
  send: Send,
  employee: UserPlus,
  department: Building2,
  field: SlidersHorizontal,
  client: Landmark,
  fail: OctagonX,
  student: GraduationCap,
  payment: Wallet,
  expense: Receipt,
  team: UserCog,
  requisition: Banknote,
  supply: PackageSearch,
};

const TONES: Record<LogEntry["kind"], string> = {
  generate: "bg-brand-gold/18 text-[oklch(0.42_0.09_70)]",
  send: "bg-brand-pine/12 text-brand-pine",
  employee: "bg-brand-pine-mid/15 text-[oklch(0.4_0.09_155)]",
  department: "bg-brand-olive/15 text-brand-olive",
  field: "bg-brand-clay/15 text-brand-clay",
  client: "bg-brand-pine-deep/12 text-brand-pine-deep",
  fail: "bg-destructive/10 text-destructive",
  student: "bg-brand-pine/12 text-brand-pine",
  payment: "bg-success/12 text-success",
  expense: "bg-brand-clay/15 text-brand-clay",
  team: "bg-brand-olive/15 text-brand-olive",
  requisition: "bg-brand-gold/18 text-[oklch(0.42_0.09_70)]",
  supply: "bg-brand-olive/15 text-brand-olive",
};

export function ActivityFeed({
  logs,
  limit = 5,
  viewAllHref,
}: {
  logs: LogEntry[];
  limit?: number;
  viewAllHref?: string;
}) {
  const t = useTranslations("dashboardWidgets");
  const locale = useLocale() as "en" | "fr";
  const items = logs.slice(0, limit);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading text-base font-semibold text-foreground">
          {t("recentActivity")}
        </h3>
        {viewAllHref ? (
          <a
            href={viewAllHref}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t("viewAuditLog")}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">{t("totalCount", { count: logs.length })}</span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("noActivityYet")}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((log) => {
            const Icon = ICONS[log.kind];
            return (
              <li key={log.id} className="flex items-start gap-3">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${TONES[log.kind]}`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 leading-snug">
                  <p className="text-sm text-foreground">{log.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {timeAgo(log.at, locale)}
                    {log.actor ? t("byActor", { name: log.actor.name }) : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
