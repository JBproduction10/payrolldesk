"use client";

import { useState } from "react";
import { Eye, Users, Receipt, ReceiptText, Send, History } from "lucide-react";
import { money, formatDate, periodLabel, timeAgo } from "@/lib/format";
import { paymentFor, schoolFinancials } from "@/lib/aggregate";
import type {
  Client,
  Expense,
  FeePayment,
  Payslip,
  Requisition,
  RequisitionCategory,
  Student,
} from "@/lib/types";
import {
  FeeStatusBadge,
  PayslipStatusBadge,
  RequisitionStatusBadge,
} from "@/components/payroll/status-badges";
import { PortalPayslipDialog } from "@/components/payroll/portal-payslip-dialog";
import { PaymentHistoryDialog } from "@/components/payroll/payment-history-dialog";
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

const TABS = ["students", "expenses", "requests", "payslips"] as const;
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
  period,
  onRefresh,
}: {
  client: Client;
  students: Student[];
  feePayments: FeePayment[];
  expenses: Expense[];
  requisitions: Requisition[];
  payslips: Payslip[];
  employees: EmployeeRef[];
  period: string;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<Tab>("students");
  const byId = new Map(employees.map((e) => [e.id, e]));
  const finance = schoolFinancials(students, feePayments, expenses, period);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          {client.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View-only roster & finances — send requests to Bonté Service for anything the school needs
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
          { key: "requests" as const, label: "Requests", icon: Send },
          { key: "payslips" as const, label: "Payslips", icon: ReceiptText },
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
        <StudentsReadOnly
          client={client}
          students={students}
          feePayments={feePayments}
          period={period}
        />
      )}
      {tab === "expenses" && <ExpensesReadOnly client={client} expenses={expenses} />}
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
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Net Pay</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payslips.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No payslips generated yet.
                    </td>
                  </tr>
                ) : (
                  payslips.map((p) => {
                    const emp = byId.get(p.employeeId);
                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {emp?.name ?? "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {periodLabel(p.period)}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {money(p.net, client.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <PayslipStatusBadge status={p.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <PortalPayslipDialog
                            payslip={p}
                            employeeName={emp?.name ?? "Unknown"}
                            employeePosition={emp?.position ?? ""}
                            currency={client.currency}
                            schoolName={client.name}
                            trigger={
                              <Button variant="outline" size="sm">
                                <Eye className="size-3.5" />
                                View
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
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 font-medium">Guardian contact</th>
              <th className="px-4 py-3 font-medium">Status — {periodLabel(period)}</th>
              <th className="px-4 py-3 text-right font-medium">History</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No students enrolled yet.
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
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Logged by</th>
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
              expenses.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{e.description}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{e.category}</td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {money(e.amount, client.currency)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(e.date)}</td>
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

/* ------------------------------ requests (to Bonté Service) ------------------------------ */

const REQ_CATEGORY_LABEL: Record<RequisitionCategory, string> = {
  fund_request: "Fund request",
  payroll: "Payroll funding",
};

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
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-medium text-foreground">
          {requisitions.length} requests to Bonté Service
        </span>
        <NewRequestDialog client={client} period={period} onCreated={onRefresh} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Requested</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requisitions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No requests submitted yet.
                </td>
              </tr>
            ) : (
              requisitions.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{r.description}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {REQ_CATEGORY_LABEL[r.category]}
                    {r.period ? ` · ${periodLabel(r.period)}` : ""}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {money(r.amountRequested, client.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <RequisitionStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.status === "paid" &&
                      `Paid ${money(r.paidAmount ?? 0, client.currency)} via ${r.paymentMethod} · ${timeAgo(r.paidAt ?? r.submittedAt)}`}
                    {r.status === "rejected" &&
                      (r.decisionNote ? `"${r.decisionNote}"` : "No reason given")}
                    {r.status === "approved" && "Awaiting payout"}
                    {r.status === "pending" && `Sent ${timeAgo(r.submittedAt)}`}
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
        toast.add({ title: "Request sent to Bonté Service", type: "success" });
        setDescription("");
        setAmount("");
        setOpen(false);
        onCreated();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.add({ title: data.error || "Could not send request", type: "error" });
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
            New Request
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Send request to Bonté Service</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-category">Type</Label>
            <NativeSelect
              id="req-category"
              className="w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value as RequisitionCategory)}
            >
              {Object.entries(REQ_CATEGORY_LABEL).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-desc">Description</Label>
            <Input
              id="req-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                category === "payroll"
                  ? `Salaries for ${periodLabel(period)}`
                  : "What is this for?"
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-amount">Amount requested ({client.currency})</Label>
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
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? "Sending…" : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
