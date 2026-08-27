"use client";

import { useEffect, useState } from "react";
import type { AuditAction, AuditEntityType, AuditLogEntry } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ACTION_LABEL: Record<AuditAction, string> = {
  delete: "Deleted",
  restore: "Restored",
  purge: "Permanently deleted",
  update: "Updated",
  generate: "Generated",
  clear: "Cleared",
  deliver: "Delivered",
};

const ENTITY_LABEL: Record<AuditEntityType, string> = {
  employee: "Employee",
  student: "Student",
  client: "Client",
  payslip: "Payslip",
  expense: "Expense",
};

const ACTION_TONE: Record<AuditAction, string> = {
  delete: "bg-destructive/10 text-destructive",
  purge: "bg-destructive/10 text-destructive",
  restore: "bg-success/12 text-success",
  update: "bg-brand-pine-mid/15 text-[oklch(0.4_0.09_155)]",
  generate: "bg-brand-gold/18 text-[oklch(0.42_0.09_70)]",
  clear: "bg-muted text-muted-foreground",
  deliver: "bg-brand-pine/12 text-brand-pine",
};

export function AuditTrailPanel() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const [entityType, setEntityType] = useState<AuditEntityType | "all">("all");
  const [action, setAction] = useState<AuditAction | "all">("all");

  const load = async (before?: string) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ limit: "25" });
      if (before) params.set("before", before);
      if (entityType !== "all") params.set("entityType", entityType);
      if (action !== "all") params.set("action", action);
      const res = await fetch(`/api/audit?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setEntries((prev) => (before ? [...prev, ...data.entries] : data.entries));
      setHasMore(data.hasMore);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Deferred a tick so the initial setLoading/setEntries calls don't fire
    // synchronously inside the effect body (react-hooks/set-state-in-effect).
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, action]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm text-muted-foreground">
          Who deleted, restored, or changed something — captured server-side
          so it can&apos;t be edited from the browser.
        </p>
        <Select value={entityType} onValueChange={(v) => v && setEntityType(v as typeof entityType)}>
          <SelectTrigger className="h-8 w-[8.5rem]" size="sm">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(ENTITY_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={(v) => v && setAction(v as typeof action)}>
          <SelectTrigger className="h-8 w-[9rem]" size="sm">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {Object.entries(ACTION_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Couldn&apos;t load the audit trail. Try again in a moment.
        </div>
      ) : entries.length === 0 && !loading ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Nothing recorded yet for this filter.
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
              <span
                className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_TONE[entry.action]}`}
              >
                {ACTION_LABEL[entry.action]}
              </span>
              <div className="min-w-0 flex-1 leading-snug">
                <p className="truncate text-sm text-foreground">
                  {ENTITY_LABEL[entry.entityType]}{" "}
                  <span className="font-medium">{entry.entityLabel}</span>
                  {entry.details && (
                    <span className="text-muted-foreground"> — {entry.details}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.actorName} · {timeAgo(entry.at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => load(entries[entries.length - 1]?.at)}
          >
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
