"use client";

import { useState, type ReactElement } from "react";
import { ReceiptText, Printer } from "lucide-react";
import { money, periodLabel } from "@/lib/format";
import type { Currency, Payslip } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PortalPayslipDialog({
  trigger,
  payslip,
  employeeName,
  employeePosition,
  currency,
  schoolName,
}: {
  trigger: ReactElement;
  payslip: Payslip;
  employeeName: string;
  employeePosition: string;
  currency: Currency;
  schoolName: string;
}) {
  const [open, setOpen] = useState(false);
  const earnings = payslip.lines.filter((l) => l.category === "earning");
  const deductions = payslip.lines.filter((l) => l.category === "deduction");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-thin sm:max-w-lg print:static print:max-h-none print:w-full print:max-w-none print:translate-x-0 print:translate-y-0 print:overflow-visible print:ring-0">
        <DialogHeader className="flex-row items-start justify-between">
          <DialogTitle>Payslip — {periodLabel(payslip.period)}</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            className="print:hidden"
            onClick={() => window.print()}
          >
            <Printer className="size-3.5" />
            Print
          </Button>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ReceiptText className="size-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-foreground">{schoolName}</div>
            <div className="text-xs text-muted-foreground">
              {employeeName} · {employeePosition}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-6">
          <div>
            <div className="mb-2 text-xs font-semibold tracking-wide text-[oklch(0.42_0.09_70)] uppercase">
              Earnings
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {earnings.map((l) => (
                <div key={l.fieldId} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{l.label}</span>
                  <span className="font-medium text-success">
                    +{money(l.amount, currency)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-2 font-semibold text-foreground">
                <span>Gross Pay</span>
                <span>{money(payslip.gross, currency)}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold tracking-wide text-brand-clay uppercase">
              Deductions
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {deductions.map((l) => (
                <div key={l.fieldId} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{l.label}</span>
                  <span className="font-medium text-destructive">
                    −{money(l.amount, currency)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-2 font-semibold text-destructive">
                <span>Total Deductions</span>
                <span>−{money(payslip.totalDeductions, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-primary px-5 py-4 text-primary-foreground">
          <div>
            <div className="text-sm opacity-85">Net Payable</div>
            <div className="font-heading text-2xl font-semibold">
              {money(payslip.net, currency)}
            </div>
          </div>
          <ReceiptText className="size-6 opacity-70" />
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {schoolName} · {periodLabel(payslip.period)} payslip
        </p>
      </DialogContent>
    </Dialog>
  );
}
