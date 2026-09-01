"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Eye,
  Users,
  Receipt,
  ReceiptText,
  Send,
  History,
  Building2,
} from "lucide-react";
import { money, formatDate, periodLabel, timeAgo } from "@/lib/format";
import { paymentFor, schoolFinancials } from "@/lib/aggregate";
import type {
  Client,
  EmployeeStatus,
  Expense,
  FeePayment,
  Payslip,
  Requisition,
  RequisitionCategory,
  Student,
} from "@/lib/types";
import {
  EmployeeStatusBadge,
  FeeStatusBadge,
  PayslipStatusBadge,
  RequisitionStatusBadge,
} from "@/components/payroll/status-badges";
import { PortalPayslipDialog } from "@/components/payroll/portal-payslip-dialog";
import { PaymentHistoryDialog } from "@/components/payroll/payment-history-dialog";
import { InitialsAvatar } from "@/components/payroll/initials-avatar";
import { colorForIndex } from "@/lib/colors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

interface EmployeeRef {
  id: string;
  name: string;
  position: string;
}

interface SchoolAdminEmployee extends EmployeeRef {
  email: string;
  departmentId: string;
  baseSalary: number;
  status: EmployeeStatus;
}

interface DepartmentRef {
  id: string;
  name: string;
  description: string;
  headId: string | null;
}

const TABS = ["students", "expenses", "employees", "departments", "requests", "payslips"] as const;
type Tab = (typeof TABS)[number];

/**
 * Session 1 — School Administration. Per the role split, this account can
 * *see* enrollment and financial entries but never edit them (that's the
 * Cashier's job) — its own capability is issuing requisitions ("bons de
 * commande") to Bonté Service. Payslips are here too, view-only, for
 * reference when preparing a payroll funding request.
 */
export function SchoolAdminView({
  client,
  students,
  feePayments,
  expenses,
  requisitions,
  payslips,
  employees,
  departments,
  period,
  onRefresh,
}: {
  client: Client;
  students: Student[];
  feePayments: FeePayment[];
  expenses: Expense[];
  requisitions: Requisition[];
  payslips: Payslip[];
  employees: SchoolAdminEmployee[];
  departments: DepartmentRef[];
  period: string;
  onRefresh: () => void;
}) {
  const t = useTranslations("schoolAdminView");
  const locale = useLocale() as "en" | "fr";
  const [tab, setTab] = useState<Tab>("students");
  const byId = new Map(employees.map((e) => [e.id, e]));
  const finance = schoolFinancials(students, feePayments, expenses, period);

  const TAB_DEFS = [
    { key: "students" as const, label: t("tabStudents"), icon: Users },
    { key: "expenses" as const, label: t("tabExpenses"), icon: Receipt },
    { key: "employees" as const, label: t("tabEmployees"), icon: Users },
    { key: "departments" as const, label: t("tabDepartments"), icon: Building2 },
    { key: "requests" as const, label: t("tabRequests"), icon: Send },
    { key: "payslips" as const, label: t("tabPayslips"), icon: ReceiptText },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          {client.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">{t("students")}</div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            {students.length}
          </div>
        </div>
        <div className="rounded-2xl border border-success/30 bg-success/5 p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">{t("feesCollected", { period: periodLabel(period, locale) })}</div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            {money(finance.feesCollected, client.currency, locale)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">{t("feesOutstanding")}</div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            {money(finance.feesOutstanding, client.currency, locale)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">{t("expensesLogged")}</div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            {money(expenses.reduce((s, x) => s + x.amount, 0), client.currency, locale)}
          </div>
        </div>
      </div>

      <div className="mb-4 inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1">
        {TAB_DEFS.map((tItem) => (
          <button
            key={tItem.key}
            onClick={() => setTab(tItem.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === tItem.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tItem.icon className="size-3.5" />
            {tItem.label}
          </button>
        ))}
      </div>

      {tab === "students" && (
        <StudentsReadOnly
          client={client}
          students={students}
          feePayments={feePayments}
          period={period}
        />
      )}
      {tab === "expenses" && <ExpensesReadOnly client={client} expenses={expenses} />}
      {tab === "employees" && (
        <EmployeesReadOnly client={client} employees={employees} departments={departments} />
      )}
      {tab === "departments" && (
        <DepartmentsReadOnly employees={employees} departments={departments} />
      )}
      {tab === "requests" && (
        <RequestsTab
          client={client}
          requisitions={requisitions}
          period={period}
          onRefresh={onRefresh}
        />
      )}
      {tab === "payslips" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">{t("columnEmployee")}</th>
                  <th className="px-4 py-3 font-medium">{t("columnPeriod")}</th>
                  <th className="px-4 py-3 font-medium">{t("columnNetPay")}</th>
                  <th className="px-4 py-3 font-medium">{t("columnStatus")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("columnView")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payslips.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      {t("noPayslipsYet")}
                    </td>
                  </tr>
                ) : (
                  payslips.map((p) => {
                    const emp = byId.get(p.employeeId);
                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {emp?.name ?? t("unknown")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {periodLabel(p.period, locale)}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {money(p.net, client.currency, locale)}
                        </td>
                        <td className="px-4 py-3">
                          <PayslipStatusBadge status={p.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <PortalPayslipDialog
                            payslip={p}
                            employeeName={emp?.name ?? t("unknown")}
                            employeePosition={emp?.position ?? ""}
                            currency={client.currency}
                            schoolName={client.name}
                            trigger={
                              <Button variant="outline" size="sm">
                                <Eye className="size-3.5" />
                                {t("view")}
                              </Button>
                            }
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ read-only students ------------------------------ */

function StudentsReadOnly({
  client,
  students,
  feePayments,
  period,
}: {
  client: Client;
  students: Student[];
  feePayments: FeePayment[];
  period: string;
}) {
  const t = useTranslations("schoolAdminView");
  const locale = useLocale() as "en" | "fr";
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">{t("columnStudent")}</th>
              <th className="px-4 py-3 font-medium">{t("columnClass")}</th>
              <th className="px-4 py-3 font-medium">{t("columnGuardianContact")}</th>
              <th className="px-4 py-3 font-medium">{t("columnStatusPeriod", { period: periodLabel(period, locale) })}</th>
              <th className="px-4 py-3 text-right font-medium">{t("columnHistory")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  {t("noStudentsYet")}
                </td>
              </tr>
            ) : (
              students.map((s) => {
                const record = paymentFor(feePayments, s.id, period);
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.className}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.guardianContact}</td>
                    <td className="px-4 py-3">
                      <FeeStatusBadge status={record?.status ?? "unpaid"} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PaymentHistoryDialog
                        studentName={s.name}
                        schoolName={client.name}
                        monthlyFee={s.monthlyFee}
                        currency={client.currency}
                        payments={feePayments.filter((p) => p.studentId === s.id)}
                        trigger={
                          <Button variant="ghost" size="icon-sm">
                            <History className="size-3.5" />
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------ read-only expenses ------------------------------ */

function ExpensesReadOnly({ client, expenses }: { client: Client; expenses: Expense[] }) {
  const t = useTranslations("schoolAdminView");
  const tCat = useTranslations("expensesPage");
  const locale = useLocale() as "en" | "fr";
  const categoryLabel = (c: string) => {
    const map: Record<string, string> = {
      fuel: tCat("categoryFuel"),
      credit: tCat("categoryCredit"),
      renovation: tCat("categoryRenovation"),
      supplies: tCat("categorySupplies"),
      utilities: tCat("categoryUtilities"),
      maintenance: tCat("categoryMaintenance"),
      other: tCat("categoryOther"),
    };
    return map[c] ?? c;
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">{t("columnDescription")}</th>
              <th className="px-4 py-3 font-medium">{t("columnCategory")}</th>
              <th className="px-4 py-3 font-medium">{t("columnAmount")}</th>
              <th className="px-4 py-3 font-medium">{t("columnDate")}</th>
              <th className="px-4 py-3 font-medium">{t("columnLoggedBy")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  {t("noExpensesYet")}
                </td>
              </tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{e.description}</td>
                  <td className="px-4 py-3 text-muted-foreground">{categoryLabel(e.category)}</td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {money(e.amount, client.currency, locale)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(e.date, locale)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.submittedBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------ read-only employees ------------------------------ */

function EmployeesReadOnly({
  client,
  employees,
  departments,
}: {
  client: Client;
  employees: SchoolAdminEmployee[];
  departments: DepartmentRef[];
}) {
  const t = useTranslations("schoolAdminView");
  const locale = useLocale() as "en" | "fr";
  const deptName = new Map(departments.map((d) => [d.id, d.name]));

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">{t("columnEmployeeName")}</th>
              <th className="px-4 py-3 font-medium">{t("columnDepartment")}</th>
              <th className="px-4 py-3 font-medium">{t("columnEmail")}</th>
              <th className="px-4 py-3 font-medium">{t("columnBaseSalary")}</th>
              <th className="px-4 py-3 font-medium">{t("columnEmployeeStatus")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  {t("noEmployeesYet")}
                </td>
              </tr>
            ) : (
              employees.map((e, i) => (
                <tr key={e.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <InitialsAvatar name={e.name} color={colorForIndex(i)} size="sm" />
                      <div>
                        <div className="font-medium text-foreground">{e.name}</div>
                        <div className="text-xs text-muted-foreground">{e.position}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {deptName.get(e.departmentId) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.email}</td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {money(e.baseSalary, client.currency, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <EmployeeStatusBadge status={e.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------ read-only departments ------------------------------ */

function DepartmentsReadOnly({
  employees,
  departments,
}: {
  employees: SchoolAdminEmployee[];
  departments: DepartmentRef[];
}) {
  const t = useTranslations("schoolAdminView");

  if (departments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
        {t("noDepartmentsYet")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {departments.map((d) => {
        const staff = employees.filter((e) => e.departmentId === d.id);
        const head = employees.find((e) => e.id === d.headId);
        const visible = staff.slice(0, 6);
        const extra = staff.length - visible.length;

        return (
          <div
            key={d.id}
            className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <Building2 className="size-4.5" />
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {t("peopleCount", { count: staff.length })}
              </span>
            </div>

            <h3 className="font-heading text-lg font-semibold text-foreground">{d.name}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{d.description}</p>

            <div className="mt-4 rounded-xl bg-muted/60 p-3">
              <div className="text-xs text-muted-foreground">{t("columnHead")}</div>
              <div className="truncate text-sm font-medium text-foreground">
                {head?.name ?? t("unassigned")}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                {t("members")}
              </div>
              <div className="flex items-center">
                {visible.map((e, i) => (
                  <InitialsAvatar
                    key={e.id}
                    name={e.name}
                    color={colorForIndex(i)}
                    size="sm"
                    className="-ml-2 border-2 border-card first:ml-0"
                  />
                ))}
                {extra > 0 && (
                  <span className="-ml-2 flex size-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[11px] font-medium text-muted-foreground">
                    +{extra}
                  </span>
                )}
                {staff.length === 0 && (
                  <span className="text-xs text-muted-foreground">{t("noMembersYet")}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ requests (to Bonté Service) ------------------------------ */

function RequestsTab({
  client,
  requisitions,
  period,
  onRefresh,
}: {
  client: Client;
  requisitions: Requisition[];
  period: string;
  onRefresh: () => void;
}) {
  const t = useTranslations("schoolAdminView");
  const locale = useLocale() as "en" | "fr";
  const categoryLabel = (c: RequisitionCategory) =>
    c === "payroll" ? t("categoryPayroll") : t("categoryFundRequest");
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-medium text-foreground">
          {t("requestsToTreasury", { count: requisitions.length })}
        </span>
        <NewRequestDialog client={client} period={period} onCreated={onRefresh} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">{t("columnDescription")}</th>
              <th className="px-4 py-3 font-medium">{t("columnType")}</th>
              <th className="px-4 py-3 font-medium">{t("columnRequested")}</th>
              <th className="px-4 py-3 font-medium">{t("columnStatus")}</th>
              <th className="px-4 py-3 font-medium">{t("columnNotes")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requisitions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  {t("noRequestsYet")}
                </td>
              </tr>
            ) : (
              requisitions.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{r.description}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {categoryLabel(r.category)}
                    {r.period ? ` · ${periodLabel(r.period, locale)}` : ""}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {money(r.amountRequested, client.currency, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <RequisitionStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.status === "paid" &&
                      t("paidVia", {
                        amount: money(r.paidAmount ?? 0, client.currency, locale),
                        method: r.paymentMethod ?? t("paymentMethodNotSpecified"),
                        time: timeAgo(r.paidAt ?? r.submittedAt, locale),
                      })}
                    {r.status === "rejected" &&
                      (r.decisionNote ? `"${r.decisionNote}"` : t("noReasonGiven"))}
                    {r.status === "approved" && t("awaitingPayout")}
                    {r.status === "pending" && t("sentAgo", { time: timeAgo(r.submittedAt, locale) })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewRequestDialog({
  client,
  period,
  onCreated,
}: {
  client: Client;
  period: string;
  onCreated: () => void;
}) {
  const t = useTranslations("schoolAdminView");
  const locale = useLocale() as "en" | "fr";
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<RequisitionCategory>("fund_request");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const valid = description.trim() && Number(amount) > 0;

  async function handleSubmit() {
    if (!valid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/portal/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description: description.trim(),
          amountRequested: Number(amount),
          period: category === "payroll" ? period : undefined,
        }),
      });
      if (res.ok) {
        toast.add({ title: t("requestSentToast"), type: "success" });
        setDescription("");
        setAmount("");
        setOpen(false);
        onCreated();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.add({ title: data.error || t("requestFailedToast"), type: "error" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Send className="size-3.5" />
            {t("newRequest")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("sendRequestTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-category">{t("type")}</Label>
            <NativeSelect
              id="req-category"
              className="w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value as RequisitionCategory)}
            >
              <NativeSelectOption value="fund_request">{t("categoryFundRequest")}</NativeSelectOption>
              <NativeSelectOption value="payroll">{t("categoryPayroll")}</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-desc">{t("description")}</Label>
            <Input
              id="req-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                category === "payroll"
                  ? t("descriptionPlaceholderPayroll", { period: periodLabel(period, locale) })
                  : t("descriptionPlaceholderOther")
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-amount">{t("amountRequested", { currency: client.currency })}</Label>
            <Input
              id="req-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? t("sending") : t("sendRequest")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
