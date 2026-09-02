"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Trash2, Wallet, Users, Receipt, History } from "lucide-react";
import { money, formatDate, periodLabel } from "@/lib/format";
import { paymentFor, paymentsForStudent, schoolFinancials } from "@/lib/aggregate";
import type {
  Client,
  Cycle,
  Expense,
  ExpenseCategory,
  FeePayment,
  FeeStatus,
  Student,
  StudentStatus,
} from "@/lib/types";
import { CYCLES, CYCLE_CLASSES, cycleLabel } from "@/lib/academic";
import { FeeStatusBadge } from "@/components/payroll/status-badges";
import { PaymentHistoryDialog } from "@/components/payroll/payment-history-dialog";
import { ConfirmDeleteDialog } from "@/components/payroll/confirm-delete-dialog";
import { PortalSectionNav } from "@/components/portal/portal-section-nav";
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

const TABS = ["students", "expenses"] as const;
type Tab = (typeof TABS)[number];

function statusForAmount(amount: number, fee: number): FeeStatus {
  if (amount <= 0) return "unpaid";
  if (amount >= fee) return "paid";
  return "partial";
}

/**
 * Session 3 — Cashier. The only school-level role that can actually enroll
 * students and change fee status on collection, or log payments for
 * supplies/services. School admin (Session 1) and the financial officer
 * (Session 2) both see this same data, but read-only.
 */
export function CashierView({
  client,
  students,
  feePayments,
  expenses,
  period,
  onRefresh,
}: {
  client: Client;
  students: Student[];
  feePayments: FeePayment[];
  expenses: Expense[];
  period: string;
  onRefresh: () => void;
}) {
  const t = useTranslations("cashierView");
  const locale = useLocale() as "en" | "fr";
  const [tab, setTab] = useState<Tab>("students");

  const finance = schoolFinancials(students, feePayments, expenses, period);

  const TAB_DEFS = [
    { key: "students" as const, label: t("tabStudents"), icon: Users },
    { key: "expenses" as const, label: t("tabExpenses"), icon: Receipt },
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

      <div className="lg:flex lg:items-start lg:gap-6">
        <PortalSectionNav items={TAB_DEFS} value={tab} onChange={setTab} />

        <div className="min-w-0 flex-1">
          {tab === "students" && (
            <StudentsTab
              client={client}
              students={students}
              feePayments={feePayments}
              period={period}
              onRefresh={onRefresh}
            />
          )}
          {tab === "expenses" && (
            <ExpensesTab client={client} expenses={expenses} onRefresh={onRefresh} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ students tab ------------------------------ */

function StudentsTab({
  client,
  students,
  feePayments,
  period,
  onRefresh,
}: {
  client: Client;
  students: Student[];
  feePayments: FeePayment[];
  period: string;
  onRefresh: () => void;
}) {
  const t = useTranslations("cashierView");
  const locale = useLocale() as "en" | "fr";
  async function remove(id: string) {
    const res = await fetch(`/api/portal/students?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.add({ title: t("studentRemovedToast"), type: "success" });
      onRefresh();
    } else {
      toast.add({ title: t("studentRemoveFailedToast"), type: "error" });
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-medium text-foreground">
          {t("studentsCount", { count: students.length })}
        </span>
        <AddStudentDialog client={client} onCreated={onRefresh} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">{t("columnStudent")}</th>
              <th className="px-4 py-3 font-medium">{t("columnClass")}</th>
              <th className="px-4 py-3 font-medium">{t("columnFee")}</th>
              <th className="px-4 py-3 font-medium">{t("columnPaid", { period: periodLabel(period, locale) })}</th>
              <th className="px-4 py-3 font-medium">{t("columnStatus")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("columnActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  {t("noStudentsYet")}
                </td>
              </tr>
            ) : (
              students.map((s) => {
                const record = paymentFor(feePayments, s.id, period);
                const history = paymentsForStudent(feePayments, s.id);
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.className}
                      <div className="text-xs">{cycleLabel(s.cycle)}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {money(s.monthlyFee, client.currency, locale)}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {money(record?.amountPaid ?? 0, client.currency, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <FeeStatusBadge status={record?.status ?? "unpaid"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <PaymentHistoryDialog
                          studentName={s.name}
                          schoolName={client.name}
                          monthlyFee={s.monthlyFee}
                          currency={client.currency}
                          payments={history}
                          trigger={
                            <Button variant="ghost" size="icon-sm">
                              <History className="size-3.5" />
                            </Button>
                          }
                        />
                        <RecordPaymentDialog
                          student={s}
                          client={client}
                          period={period}
                          payment={record}
                          onSaved={onRefresh}
                        />
                        <ConfirmDeleteDialog
                          title={t("removeConfirmTitle", { name: s.name })}
                          description={t("removeConfirmDescription")}
                          onConfirm={() => remove(s.id)}
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

function AddStudentDialog({
  client,
  onCreated,
}: {
  client: Client;
  onCreated: () => void;
}) {
  const t = useTranslations("cashierView");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [cycle, setCycle] = useState<Cycle>("primaire");
  const [className, setClassName] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [guardianContact, setGuardianContact] = useState("");
  const [status, setStatus] = useState<StudentStatus>("active");
  const [loading, setLoading] = useState(false);

  const valid = name.trim() && className.trim() && Number(monthlyFee) > 0;

  async function handleSubmit() {
    if (!valid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/portal/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          cycle,
          className: className.trim(),
          guardianContact: guardianContact.trim(),
          monthlyFee: Number(monthlyFee),
          status,
          joinDate: new Date().toISOString().slice(0, 10),
          note: "",
        }),
      });
      if (res.ok) {
        toast.add({ title: t("studentAddedToast", { name: name.trim() }), type: "success" });
        setName("");
        setCycle("primaire");
        setClassName("");
        setMonthlyFee("");
        setGuardianContact("");
        setOpen(false);
        onCreated();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.add({ title: data.error || t("studentAddFailedToast"), type: "error" });
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
            <Plus className="size-3.5" />
            {t("addStudent")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("addStudentTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-name">{t("fullName")}</Label>
            <Input id="as-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-cycle">{t("cycle")}</Label>
            <NativeSelect
              id="as-cycle"
              className="w-full"
              value={cycle}
              onChange={(e) => {
                const next = e.target.value as Cycle;
                setCycle(next);
                setClassName("");
              }}
            >
              {CYCLES.map((c) => (
                <NativeSelectOption key={c.value} value={c.value}>
                  {c.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-class">{t("class")}</Label>
            <NativeSelect
              id="as-class"
              className="w-full"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            >
              <NativeSelectOption value="" disabled>
                {t("selectClass")}
              </NativeSelectOption>
              {CYCLE_CLASSES[cycle].map((cls) => (
                <NativeSelectOption key={cls} value={cls}>
                  {cls}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-fee">{t("monthlyFee", { currency: client.currency })}</Label>
            <Input
              id="as-fee"
              type="number"
              min={0}
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-contact">{t("guardianContact")}</Label>
            <Input
              id="as-contact"
              value={guardianContact}
              onChange={(e) => setGuardianContact(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-status">{t("status")}</Label>
            <NativeSelect
              id="as-status"
              className="w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as StudentStatus)}
            >
              <NativeSelectOption value="active">{t("statusActive")}</NativeSelectOption>
              <NativeSelectOption value="withdrawn">{t("statusWithdrawn")}</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? t("adding") : t("addStudent")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordPaymentDialog({
  student,
  client,
  period,
  payment,
  onSaved,
}: {
  student: Student;
  client: Client;
  period: string;
  payment?: FeePayment;
  onSaved: () => void;
}) {
  const t = useTranslations("cashierView");
  const locale = useLocale() as "en" | "fr";
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(payment?.amountPaid ?? 0));
  const [status, setStatus] = useState<FeeStatus>(payment?.status ?? "unpaid");
  const [loading, setLoading] = useState(false);

  function handleAmountChange(value: string) {
    setAmount(value);
    const n = Number(value);
    if (!Number.isNaN(n) && status !== "social_case") {
      setStatus(statusForAmount(n, student.monthlyFee));
    }
  }

  async function handleSubmit() {
    setLoading(true);
    const n = Math.max(0, Number(amount) || 0);
    try {
      const res = await fetch("/api/portal/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          period,
          amountPaid: n,
          status,
        }),
      });
      if (res.ok) {
        toast.add({
          title: t("paymentRecordedToast", { period: periodLabel(period, locale), name: student.name }),
          type: "success",
        });
        setOpen(false);
        onSaved();
      } else {
        toast.add({ title: t("paymentFailedToast"), type: "error" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setAmount(String(payment?.amountPaid ?? 0));
          setStatus(payment?.status ?? "unpaid");
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Wallet className="size-3.5" />
            {t("payment")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("recordPaymentTitle", { name: student.name })}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{periodLabel(period, locale)}</p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-amount">{t("amountPaid", { currency: client.currency })}</Label>
            <Input
              id="rp-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-status">{t("status")}</Label>
            <NativeSelect
              id="rp-status"
              className="w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as FeeStatus)}
            >
              <NativeSelectOption value="paid">{t("statusPaid")}</NativeSelectOption>
              <NativeSelectOption value="partial">{t("statusPartial")}</NativeSelectOption>
              <NativeSelectOption value="unpaid">{t("statusUnpaid")}</NativeSelectOption>
              <NativeSelectOption value="social_case">{t("statusSocialCase")}</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t("saving") : t("savePayment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ expenses tab ------------------------------ */

function useExpenseCategoryLabel() {
  const t = useTranslations("cashierView");
  const map: Record<ExpenseCategory, string> = {
    fuel: t("categoryFuel"),
    credit: t("categoryCredit"),
    renovation: t("categoryRenovation"),
    supplies: t("categorySupplies"),
    utilities: t("categoryUtilities"),
    maintenance: t("categoryMaintenance"),
    other: t("categoryOther"),
  };
  return (c: ExpenseCategory) => map[c];
}

function ExpensesTab({
  client,
  expenses,
  onRefresh,
}: {
  client: Client;
  expenses: Expense[];
  onRefresh: () => void;
}) {
  const t = useTranslations("cashierView");
  const locale = useLocale() as "en" | "fr";
  const categoryLabel = useExpenseCategoryLabel();
  async function remove(id: string) {
    const res = await fetch(`/api/portal/expenses?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.add({ title: t("expenseRemovedToast"), type: "success" });
      onRefresh();
    } else {
      toast.add({ title: t("expenseRemoveFailedToast"), type: "error" });
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-medium text-foreground">
          {t("entries", { count: expenses.length })}
        </span>
        <AddExpenseDialog client={client} onCreated={onRefresh} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">{t("columnDescription")}</th>
              <th className="px-4 py-3 font-medium">{t("columnCategory")}</th>
              <th className="px-4 py-3 font-medium">{t("columnDate")}</th>
              <th className="px-4 py-3 font-medium">{t("columnAmount")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("columnActions")}</th>
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
              [...expenses]
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {e.description}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {categoryLabel(e.category)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(e.date, locale)}
                    </td>
                    <td className="px-4 py-3 font-medium text-destructive">
                      −{money(e.amount, client.currency, locale)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ConfirmDeleteDialog
                        title={t("expenseRemoveConfirmTitle")}
                        description={t("expenseRemoveConfirmDescription")}
                        onConfirm={() => remove(e.id)}
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

function AddExpenseDialog({
  client,
  onCreated,
}: {
  client: Client;
  onCreated: () => void;
}) {
  const t = useTranslations("cashierView");
  const categoryLabel = useExpenseCategoryLabel();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const valid = description.trim() && Number(amount) > 0 && date;

  const CATEGORIES: ExpenseCategory[] = ["fuel", "credit", "renovation", "supplies", "utilities", "maintenance", "other"];

  async function handleSubmit() {
    if (!valid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/portal/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          category,
          amount: Number(amount),
          date,
        }),
      });
      if (res.ok) {
        toast.add({ title: t("expenseLoggedToast"), type: "success" });
        setDescription("");
        setAmount("");
        setOpen(false);
        onCreated();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.add({ title: data.error || t("expenseFailedToast"), type: "error" });
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
            <Plus className="size-3.5" />
            {t("logExpense")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("logExpenseTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ae-desc">{t("description")}</Label>
            <Input
              id="ae-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ae-category">{t("category")}</Label>
              <NativeSelect
                id="ae-category"
                className="w-full"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              >
                {CATEGORIES.map((c) => (
                  <NativeSelectOption key={c} value={c}>
                    {categoryLabel(c)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ae-amount">{t("amount", { currency: client.currency })}</Label>
              <Input
                id="ae-amount"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ae-date">{t("date")}</Label>
            <Input
              id="ae-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? t("logging") : t("logExpense")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
