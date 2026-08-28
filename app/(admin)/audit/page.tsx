"use client";

import { useMemo, useState } from "react";
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
  Search,
  ShieldAlert,
  Banknote,
  PackageSearch,
} from "lucide-react";
import { usePayroll } from "@/lib/store";
import type { LogEntry } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/format";
import { usePagination } from "@/lib/use-pagination";
import { PageHeader } from "@/components/payroll/page-header";
import { TablePagination } from "@/components/payroll/table-pagination";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const KIND_LABEL_KEY: Record<LogEntry["kind"], string> = {
  generate: "kindGenerate",
  send: "kindSend",
  employee: "kindEmployee",
  department: "kindDepartment",
  field: "kindField",
  client: "kindClient",
  fail: "kindFail",
  student: "kindStudent",
  payment: "kindPayment",
  expense: "kindExpense",
  team: "kindTeam",
  requisition: "kindRequisition",
  supply: "kindSupply",
};

const KIND_OPTIONS = Object.keys(KIND_LABEL_KEY) as LogEntry["kind"][];

export default function AuditLogPage() {
  const t = useTranslations("auditPage");
  const locale = useLocale() as "en" | "fr";
  const { logs, clients } = usePayroll();
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | LogEntry["kind"]>("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [sensitiveOnly, setSensitiveOnly] = useState(false);

  const clientName = useMemo(() => {
    const map = new Map(clients.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? "—";
  }, [clients]);

  // Most recent first — logs are already stored newest-first, but sort
  // defensively in case that ever changes.
  const sorted = useMemo(
    () => [...logs].sort((a, b) => (a.at < b.at ? 1 : -1)),
    [logs],
  );

  const filtered = sorted.filter((log) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      log.message.toLowerCase().includes(q) ||
      (log.actor?.name.toLowerCase().includes(q) ?? false);
    const matchesKind = kindFilter === "all" || log.kind === kindFilter;
    const matchesClient = clientFilter === "all" || log.clientId === clientFilter;
    const matchesSensitive = !sensitiveOnly || log.sensitive;
    return matchesQuery && matchesKind && matchesClient && matchesSensitive;
  });

  const { page, setPage, pageCount, pageRows, from, to, total, resetPage } =
    usePagination(filtered, 30);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPage();
            }}
            placeholder={t("searchPlaceholder")}
            className="h-9 pl-9"
          />
        </div>

        <Select
          value={clientFilter}
          onValueChange={(value) => {
            setClientFilter(value ?? "all");
            resetPage();
          }}
        >
          <SelectTrigger className="h-9 w-full sm:w-48">
            <SelectValue placeholder={t("allClients")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allClients")}</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={kindFilter}
          onValueChange={(value) => {
            setKindFilter((value as LogEntry["kind"] | "all") ?? "all");
            resetPage();
          }}
        >
          <SelectTrigger className="h-9 w-full sm:w-48">
            <SelectValue placeholder={t("allActionTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allActionTypes")}</SelectItem>
            {KIND_OPTIONS.map((k) => (
              <SelectItem key={k} value={k}>
                {t(KIND_LABEL_KEY[k])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Label className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
          <Switch
            checked={sensitiveOnly}
            onCheckedChange={(checked) => {
              setSensitiveOnly(checked === true);
              resetPage();
            }}
          />
          <ShieldAlert className="size-3.5 text-muted-foreground" />
          {t("sensitiveOnly")}
        </Label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("columnAction")}</TableHead>
                <TableHead>{t("columnClient")}</TableHead>
                <TableHead>{t("columnBy")}</TableHead>
                <TableHead className="text-right">{t("columnWhen")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                    {t("noActivity")}
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((log) => {
                  const Icon = ICONS[log.kind];
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${
                              log.sensitive
                                ? "bg-destructive/10 text-destructive"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="size-3.5" />
                          </span>
                          <span className="text-sm text-foreground">{log.message}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {clientName(log.clientId)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.actor ? log.actor.name : t("system")}
                      </TableCell>
                      <TableCell
                        className="text-right text-xs text-muted-foreground"
                        title={formatDate(log.at, locale)}
                      >
                        {timeAgo(log.at, locale)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          page={page}
          pageCount={pageCount}
          from={from}
          to={to}
          total={total}
          onPageChange={setPage}
          itemLabel={t("itemLabel")}
        />
      </div>
    </>
  );
}
