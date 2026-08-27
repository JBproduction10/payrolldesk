"use client";

import { useState } from "react";
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
  const [tab, setTab] = useState<Tab>("students");

  const finance = schoolFinancials(students, feePayments, expenses, period);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          {client.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enroll students, record fee payments, and log supply/service payments
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">Students</div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            {students.length}
          </div>
        </div>
        <div className="rounded-2xl border border-success/30 bg-success/5 p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">Fees collected — {periodLabel(period)}</div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            {money(finance.feesCollected, client.currency)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">Fees outstanding</div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            {money(finance.feesOutstanding, client.currency)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">Expenses logged</div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            {money(expenses.reduce((s, x) => s + x.amount, 0), client.currency)}
          </div>
        </div>
      </div>

      <div className="mb-4 inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1">
        {[
          { key: "students" as const, label: "Students", icon: Users },
          { key: "expenses" as const, label: "Expenses", icon: Receipt },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

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
  async function remove(id: string) {
    const res = await fetch(`/api/portal/students?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.add({ title: "Student removed", type: "success" });
      onRefresh();
    } else {
      toast.add({ title: "Could not remove student", type: "error" });
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-medium text-foreground">
          {students.length} students
        </span>
        <AddStudentDialog client={client} onCreated={onRefresh} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 font-medium">Fee</th>
              <th className="px-4 py-3 font-medium">Paid ({periodLabel(period)})</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No students enrolled yet.
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
                      {money(s.monthlyFee, client.currency)}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {money(record?.amountPaid ?? 0, client.currency)}
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
                          title={`Remove ${s.name}?`}
                          description="This deletes their enrollment and full payment history."
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
        toast.add({ title: `Added ${name.trim()}`, type: "success" });
        setName("");
        setCycle("primaire");
        setClassName("");
        setMonthlyFee("");
        setGuardianContact("");
        setOpen(false);
        onCreated();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.add({ title: data.error || "Could not add student", type: "error" });
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
            Add Student
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add student</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-name">Full name</Label>
            <Input id="as-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-cycle">Cycle</Label>
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
            <Label htmlFor="as-class">Class</Label>
            <NativeSelect
              id="as-class"
              className="w-full"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            >
              <NativeSelectOption value="" disabled>
                Select a class…
              </NativeSelectOption>
              {CYCLE_CLASSES[cycle].map((cls) => (
                <NativeSelectOption key={cls} value={cls}>
                  {cls}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-fee">Monthly fee ({client.currency})</Label>
            <Input
              id="as-fee"
              type="number"
              min={0}
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-contact">Guardian contact</Label>
            <Input
              id="as-contact"
              value={guardianContact}
              onChange={(e) => setGuardianContact(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-status">Status</Label>
            <NativeSelect
              id="as-status"
              className="w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as StudentStatus)}
            >
              <NativeSelectOption value="active">Active</NativeSelectOption>
              <NativeSelectOption value="withdrawn">Withdrawn</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? "Adding…" : "Add Student"}
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
          title: `Recorded ${periodLabel(period)} payment for ${student.name}`,
          type: "success",
        });
        setOpen(false);
        onSaved();
      } else {
        toast.add({ title: "Could not save payment", type: "error" });
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
            Payment
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record payment — {student.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{periodLabel(period)}</p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-amount">Amount paid ({client.currency})</Label>
            <Input
              id="rp-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-status">Status</Label>
            <NativeSelect
              id="rp-status"
              className="w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as FeeStatus)}
            >
              <NativeSelectOption value="paid">Paid</NativeSelectOption>
              <NativeSelectOption value="partial">Partial</NativeSelectOption>
              <NativeSelectOption value="unpaid">Unpaid</NativeSelectOption>
              <NativeSelectOption value="social_case">Social case</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : "Save Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ expenses tab ------------------------------ */

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  fuel: "Fuel",
  credit: "Credit repayment",
  renovation: "Renovation",
  supplies: "Supplies",
  utilities: "Utilities",
  maintenance: "Maintenance",
  other: "Other",
};

function ExpensesTab({
  client,
  expenses,
  onRefresh,
}: {
  client: Client;
  expenses: Expense[];
  onRefresh: () => void;
}) {
  async function remove(id: string) {
    const res = await fetch(`/api/portal/expenses?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.add({ title: "Expense removed", type: "success" });
      onRefresh();
    } else {
      toast.add({ title: "Could not remove expense", type: "error" });
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-medium text-foreground">
          {expenses.length} entries
        </span>
        <AddExpenseDialog client={client} onCreated={onRefresh} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No expenses logged yet.
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
                      {CATEGORY_LABEL[e.category]}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(e.date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-destructive">
                      −{money(e.amount, client.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ConfirmDeleteDialog
                        title="Remove this expense?"
                        description="This entry will no longer count toward your totals."
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
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const valid = description.trim() && Number(amount) > 0 && date;

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
        toast.add({ title: "Expense logged", type: "success" });
        setDescription("");
        setAmount("");
        setOpen(false);
        onCreated();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.add({ title: data.error || "Could not log expense", type: "error" });
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
            Log Expense
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Log expense</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ae-desc">Description</Label>
            <Input
              id="ae-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ae-category">Category</Label>
              <NativeSelect
                id="ae-category"
                className="w-full"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              >
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ae-amount">Amount ({client.currency})</Label>
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
            <Label htmlFor="ae-date">Date</Label>
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
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? "Logging…" : "Log Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
