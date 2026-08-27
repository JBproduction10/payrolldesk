"use client";

import { useState } from "react";
import { Eye, ReceiptText, Search, Users, FileBarChart } from "lucide-react";
import { money, periodLabel } from "@/lib/format";
import { paymentFor, type SchoolFinancials } from "@/lib/aggregate";
import type { Client, FeePayment, Payslip, Student } from "@/lib/types";
import { FeeStatusBadge, PayslipStatusBadge } from "@/components/payroll/status-badges";
import { PortalPayslipDialog } from "@/components/payroll/portal-payslip-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EmployeeRef {
  id: string;
  name: string;
  position: string;
}

const TABS = ["payslips", "students", "report"] as const;
type Tab = (typeof TABS)[number];

/**
 * Session 2 — Financial Officer ("Responsable Financier"). Verifies
 * student fee status and generates the school's financial report, but per
 * the role split has no enrollment or status-change rights — every table
 * here is read-only; the actual collection happens at the Cashier.
 */
export function FinanceView({
  client,
  payslips,
  employees,
  students,
  feePayments,
  financials,
  period,
}: {
  client: Client;
  payslips: Payslip[];
  employees: EmployeeRef[];
  students: Student[];
  feePayments: FeePayment[];
  financials: SchoolFinancials;
  period: string;
}) {
  const [tab, setTab] = useState<Tab>("payslips");
  const [query, setQuery] = useState("");
  const byId = new Map(employees.map((e) => [e.id, e]));

  const filtered = payslips.filter((p) => {
    const emp = byId.get(p.employeeId);
    const q = query.trim().toLowerCase();
    return !q || emp?.name.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          {client.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify fee status and payslips — read-only
        </p>
      </div>

      <div className="mb-4 inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1">
        {[
          { key: "payslips" as const, label: "Payslips", icon: ReceiptText },
          { key: "students" as const, label: "Students", icon: Users },
          { key: "report" as const, label: "Report", icon: FileBarChart },
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

      {tab === "payslips" && (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="h-9 pl-9"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
              <ReceiptText className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No payslips to show.</p>
            </div>
          ) : (
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
                    {filtered.map((p) => {
                      const emp = byId.get(p.employeeId);
                      return (
                        <tr key={p.id}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">
                              {emp?.name ?? "Unknown"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {emp?.position ?? ""}
                            </div>
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
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "students" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Status — {periodLabel(period)}</th>
                  <th className="px-4 py-3 text-right font-medium">Amount paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
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
                        <td className="px-4 py-3">
                          <FeeStatusBadge status={record?.status ?? "unpaid"} />
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">
                          {money(record?.amountPaid ?? 0, client.currency)}
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

      {tab === "report" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">Students</div>
            <div className="mt-1 font-heading text-lg font-semibold text-foreground">
              {financials.studentCount}
            </div>
          </div>
          <div className="rounded-2xl border border-success/30 bg-success/5 p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">Fees collected — {periodLabel(period)}</div>
            <div className="mt-1 font-heading text-lg font-semibold text-foreground">
              {money(financials.feesCollected, client.currency)}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">Fees outstanding</div>
            <div className="mt-1 font-heading text-lg font-semibold text-foreground">
              {money(financials.feesOutstanding, client.currency)}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">Unpaid students</div>
            <div className="mt-1 font-heading text-lg font-semibold text-foreground">
              {financials.unpaidCount}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">Social case students</div>
            <div className="mt-1 font-heading text-lg font-semibold text-foreground">
              {financials.socialCaseCount}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">Expenses this month</div>
            <div className="mt-1 font-heading text-lg font-semibold text-foreground">
              {money(financials.expensesThisMonth, client.currency)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
