"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Search, Plus, Pencil, Trash2, Wallet, History } from "lucide-react";
import { usePayroll } from "@/lib/store";
import { money, periodLabel } from "@/lib/format";
import { paymentFor, paymentsForStudent, schoolFinancials } from "@/lib/aggregate";
import type { FeeStatus } from "@/lib/types";
import { cycleLabel } from "@/lib/academic";
import { PageHeader } from "@/components/payroll/page-header";
import { StatCard } from "@/components/payroll/stat-card";
import { PeriodSwitcher } from "@/components/payroll/period-switcher";
import { FeeStatusBadge } from "@/components/payroll/status-badges";
import { StudentFormDialog } from "@/components/payroll/student-form-dialog";
import { ImportStudentsDialog } from "@/components/payroll/import-students-dialog";
import { RecordPaymentDialog } from "@/components/payroll/record-payment-dialog";
import { PaymentHistoryDialog } from "@/components/payroll/payment-history-dialog";
import { ConfirmDeleteDialog } from "@/components/payroll/confirm-delete-dialog";
import { TrashDialog } from "@/components/payroll/trash-dialog";
import { TablePagination } from "@/components/payroll/table-pagination";
import { usePagination } from "@/lib/use-pagination";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_TABS: {
  key: "all" | FeeStatus | "none";
  labelKey: "statusAll" | "statusPaid" | "statusPartial" | "statusUnpaid" | "statusSocialCase" | "statusNone";
}[] = [
  { key: "all", labelKey: "statusAll" },
  { key: "paid", labelKey: "statusPaid" },
  { key: "partial", labelKey: "statusPartial" },
  { key: "unpaid", labelKey: "statusUnpaid" },
  { key: "social_case", labelKey: "statusSocialCase" },
  { key: "none", labelKey: "statusNone" },
];

export default function StudentsPage() {
  const t = useTranslations("studentsPage");
  const locale = useLocale() as "en" | "fr";
  const {
    activeClient,
    clientStudents,
    clientFeePayments,
    deletedStudents,
    period,
    removeStudent,
    restoreStudent,
  } = usePayroll();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FeeStatus | "none">("all");

  const finance = useMemo(
    () => schoolFinancials(clientStudents, clientFeePayments, [], period),
    [clientStudents, clientFeePayments, period],
  );

  const filtered = clientStudents.filter((s) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q || s.name.toLowerCase().includes(q) || s.className.toLowerCase().includes(q);
    const record = paymentFor(clientFeePayments, s.id, period);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "none" ? !record : record?.status === statusFilter);
    return matchesQuery && matchesStatus;
  });

  const { page, setPage, pageCount, pageRows, from, to, total, resetPage } =
    usePagination(filtered, 25);

  function handleDelete(id: string, name: string) {
    removeStudent(id);
    toast.add({
      title: t("removedToast", { name }),
      type: "success",
      actionProps: {
        children: t("undo"),
        onClick: () => restoreStudent(id),
      },
    });
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description", { count: clientStudents.length, schoolName: activeClient.name })}
        action={
          <div className="flex items-center gap-2">
            <PeriodSwitcher />
            <TrashDialog
              trigger={
                <Button variant="outline">
                  <Trash2 className="size-4" />
                  {t("trash")}
                  {deletedStudents.length > 0 ? ` (${deletedStudents.length})` : ""}
                </Button>
              }
              title={t("deletedStudentsTitle")}
              emptyLabel={t("noDeletedStudents")}
              rows={deletedStudents.map((s) => ({
                id: s.id,
                name: s.name,
                deletedAt: s.deletedAt,
                meta: s.className,
              }))}
              onRestore={restoreStudent}
            />
            <ImportStudentsDialog />
            <StudentFormDialog
              trigger={
                <Button>
                  <Plus className="size-4" />
                  {t("addStudent")}
                </Button>
              }
            />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("statCardStudents")} value={finance.studentCount} />
        <StatCard
          label={t("statCardFeesCollected", { period: periodLabel(period, locale) })}
          value={money(finance.feesCollected, activeClient.currency, locale)}
          className="border-success/30 bg-success/5"
        />
        <StatCard
          label={t("statCardFeesOutstanding")}
          value={money(finance.feesOutstanding, activeClient.currency, locale)}
          trend={<span>{t("unpaidAndSocial", { unpaid: finance.unpaidCount, social: finance.socialCaseCount })}</span>}
        />
      </div>

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
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1">
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
                <TableHead>{t("columnStudent")}</TableHead>
                <TableHead>{t("columnClass")}</TableHead>
                <TableHead>{t("columnMonthlyFee")}</TableHead>
                <TableHead>{t("columnPaid", { period: periodLabel(period, locale) })}</TableHead>
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
                pageRows.map((s) => {
                  const record = paymentFor(clientFeePayments, s.id, period);
                  const history = paymentsForStudent(clientFeePayments, s.id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.guardianContact || t("noGuardianContact")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                          {s.className}
                        </span>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {cycleLabel(s.cycle)}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {money(s.monthlyFee, activeClient.currency, locale)}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {money(record?.amountPaid ?? 0, activeClient.currency, locale)}
                      </TableCell>
                      <TableCell>
                        <FeeStatusBadge status={record?.status ?? "unpaid"} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <PaymentHistoryDialog
                            studentName={s.name}
                            schoolName={activeClient.name}
                            monthlyFee={s.monthlyFee}
                            currency={activeClient.currency}
                            payments={history}
                            trigger={
                              <Button variant="ghost" size="icon-sm">
                                <History className="size-3.5" />
                              </Button>
                            }
                          />
                          <RecordPaymentDialog
                            student={s}
                            period={period}
                            payment={record}
                            trigger={
                              <Button variant="outline" size="sm">
                                <Wallet className="size-3.5" />
                                {t("payment")}
                              </Button>
                            }
                          />
                          <StudentFormDialog
                            student={s}
                            trigger={
                              <Button variant="ghost" size="icon-sm">
                                <Pencil className="size-3.5" />
                              </Button>
                            }
                          />
                          <ConfirmDeleteDialog
                            title={t("removeConfirmTitle", { name: s.name })}
                            description={t("removeConfirmDescription")}
                            onConfirm={() => handleDelete(s.id, s.name)}
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
