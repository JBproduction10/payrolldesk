"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Search, Plus, Pencil, Trash2, Mail, Phone } from "lucide-react";
import { usePayroll } from "@/lib/store";
import { money } from "@/lib/format";
import { colorForIndex } from "@/lib/colors";
import type { EmployeeStatus } from "@/lib/types";
import { usePagination } from "@/lib/use-pagination";
import { PageHeader } from "@/components/payroll/page-header";
import { InitialsAvatar } from "@/components/payroll/initials-avatar";
import { EmployeeStatusBadge } from "@/components/payroll/status-badges";
import { EmployeeFormDialog } from "@/components/payroll/employee-form-dialog";
import { ImportEmployeesDialog } from "@/components/payroll/import-employees-dialog";
import { ConfirmDeleteDialog } from "@/components/payroll/confirm-delete-dialog";
import { TrashDialog } from "@/components/payroll/trash-dialog";
import { TablePagination } from "@/components/payroll/table-pagination";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const STATUS_TABS: { key: "all" | EmployeeStatus; labelKey: "statusAll" | "statusActive" | "statusLeave" | "statusInactive" }[] = [
  { key: "all", labelKey: "statusAll" },
  { key: "active", labelKey: "statusActive" },
  { key: "leave", labelKey: "statusLeave" },
  { key: "inactive", labelKey: "statusInactive" },
];

export default function EmployeesPage() {
  const t = useTranslations("employeesPage");
  const locale = useLocale() as "en" | "fr";
  const {
    activeClient,
    clientEmployees,
    clientDepartments,
    deletedEmployees,
    removeEmployee,
    restoreEmployee,
  } = usePayroll();
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | EmployeeStatus>("all");

  const deptName = useMemo(() => {
    const map = new Map(clientDepartments.map((d) => [d.id, d.name]));
    return (id: string) => map.get(id) ?? "—";
  }, [clientDepartments]);

  const filtered = clientEmployees.filter((e) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.position.toLowerCase().includes(q);
    const matchesDept = deptFilter === "all" || e.departmentId === deptFilter;
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesQuery && matchesDept && matchesStatus;
  });

  const { page, setPage, pageCount, pageRows, from, to, total, resetPage } =
    usePagination(filtered, 25);

  function handleDelete(id: string, name: string) {
    removeEmployee(id);
    toast.add({
      title: t("removedToast", { name }),
      type: "success",
      actionProps: {
        children: t("undo"),
        onClick: () => restoreEmployee(id),
      },
    });
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description", { count: clientEmployees.length, deptCount: clientDepartments.length })}
        action={
          <div className="flex items-center gap-2">
            <TrashDialog
              trigger={
                <Button variant="outline">
                  <Trash2 className="size-4" />
                  {t("trash")}
                  {deletedEmployees.length > 0 ? ` (${deletedEmployees.length})` : ""}
                </Button>
              }
              title={t("deletedEmployeesTitle")}
              emptyLabel={t("noDeletedEmployees")}
              rows={deletedEmployees.map((e) => ({
                id: e.id,
                name: e.name,
                deletedAt: e.deletedAt,
                meta: deptName(e.departmentId),
              }))}
              onRestore={restoreEmployee}
            />
            <ImportEmployeesDialog />
            <EmployeeFormDialog
              trigger={
                <Button>
                  <Plus className="size-4" />
                  {t("addEmployee")}
                </Button>
              }
            />
          </div>
        }
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
          value={deptFilter}
          onValueChange={(value) => {
            setDeptFilter(value ?? "all");
            resetPage();
          }}
        >
          <SelectTrigger className="h-9 w-full sm:w-52">
            <SelectValue placeholder={t("allDepartments")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allDepartments")}</SelectItem>
            {clientDepartments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                resetPage();
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("columnEmployee")}</TableHead>
                <TableHead>{t("columnDepartment")}</TableHead>
                <TableHead>{t("columnEmail")}</TableHead>
                <TableHead>{t("columnSalary")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
                <TableHead className="text-right">{t("columnActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    {t("noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((e, i) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <InitialsAvatar name={e.name} color={colorForIndex(i)} />
                        <div className="leading-tight">
                          <div className="font-medium text-foreground">{e.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {e.position}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                        {deptName(e.departmentId)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="flex items-center gap-1.5 text-foreground">
                          <Mail className="size-3.5 text-muted-foreground" />
                          {e.email}
                        </span>
                        {e.phone && (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="size-3" />
                            {e.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {money(e.baseSalary, activeClient.currency, locale)}
                    </TableCell>
                    <TableCell>
                      <EmployeeStatusBadge status={e.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <EmployeeFormDialog
                          employee={e}
                          trigger={
                            <Button variant="ghost" size="icon-sm">
                              <Pencil className="size-3.5" />
                            </Button>
                          }
                        />
                        <ConfirmDeleteDialog
                          title={t("removeConfirmTitle", { name: e.name })}
                          description={t("removeConfirmDescription")}
                          onConfirm={() => handleDelete(e.id, e.name)}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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

