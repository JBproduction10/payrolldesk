"use client";

import { useMemo, useState } from "react";
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

const KIND_LABEL: Record<LogEntry["kind"], string> = {
  generate: "Payslip generation",
  send: "Payslip delivery",
  employee: "Employees",
  department: "Departments",
  field: "Pay fields",
  client: "Clients",
  fail: "Delivery failure",
  student: "Students",
  payment: "Fee payments",
  expense: "Expenses",
  team: "Team & access",
  requisition: "Requisitions",
  supply: "Supplies & logistics",
};

const KIND_OPTIONS = Object.keys(KIND_LABEL) as LogEntry["kind"][];

export default function AuditLogPage() {
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
        title="Audit Log"
        description="Who did what, and when — across every client. Nothing here can be deleted."
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
            placeholder="Search action or person…"
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
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
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
            <SelectValue placeholder="All action types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All action types</SelectItem>
            {KIND_OPTIONS.map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_LABEL[k]}
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
          Sensitive only
        </Label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Action</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>By</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                    No activity matches your filters.
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
                        {log.actor ? log.actor.name : "System"}
                      </TableCell>
                      <TableCell
                        className="text-right text-xs text-muted-foreground"
                        title={formatDate(log.at)}
                      >
                        {timeAgo(log.at)}
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
          itemLabel="entries"
        />
      </div>
    </>
  );
}
