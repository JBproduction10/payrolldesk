"use client";

import { useState, type ReactElement } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Clock, CheckCircle2, ReceiptText, Printer } from "lucide-react";
import { usePayroll } from "@/lib/store";
import type { Employee, Payslip } from "@/lib/types";
import { computePayslip } from "@/lib/payroll";
import { money, periodLabel, formatDate } from "@/lib/format";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InitialsAvatar } from "./initials-avatar";
import { colorForIndex } from "@/lib/colors";

export function PayslipPreviewDialog({
  trigger,
  employee,
  payslip,
  period,
  departmentName,
  avatarIndex = 0,
}: {
  trigger: ReactElement;
  employee: Employee;
  payslip?: Payslip;
  period: string;
  departmentName: string;
  avatarIndex?: number;
}) {
  const t = useTranslations("payslipPreview");
  const locale = useLocale() as "en" | "fr";
  const { activeClient, clientFields, setDelivery } = usePayroll();
  const [open, setOpen] = useState(false);

  const computed = payslip
    ? {
        earnings: payslip.lines.filter((l) => l.category === "earning"),
        deductions: payslip.lines.filter((l) => l.category === "deduction"),
        info: payslip.lines.filter((l) => l.category === "info"),
        gross: payslip.gross,
        totalDeductions: payslip.totalDeductions,
        net: payslip.net,
      }
    : computePayslip(employee, clientFields);

  const isDraft = !payslip || payslip.status === "draft" || payslip.status === "partial";
  const sentAt = payslip
    ? Object.values(payslip.delivery)
        .map((d) => d?.at)
        .filter(Boolean)
        .sort()
        .at(-1)
    : null;

  function markSent() {
    if (!payslip) return;
    for (const ch of Object.keys(payslip.delivery) as Array<keyof Payslip["delivery"]>) {
      setDelivery(payslip.id, ch as "email" | "whatsapp", "sent");
    }
    toast.add({ title: t("markedSentToast", { name: employee.name }), type: "success" });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-thin sm:max-w-lg print:static print:max-h-none print:w-full print:max-w-none print:translate-x-0 print:translate-y-0 print:overflow-visible print:ring-0">
        <DialogHeader className="flex-row items-start justify-between">
          <DialogTitle>{t("title")}</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            className="print:hidden"
            onClick={() => window.print()}
          >
            <Printer className="size-3.5" />
            {t("print")}
          </Button>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ReceiptText className="size-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-foreground">
                {activeClient.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("payslipFor", { period: periodLabel(period, locale) })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              {departmentName}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                isDraft
                  ? "bg-brand-gold/20 text-[oklch(0.42_0.09_70)]"
                  : "bg-success/12 text-success"
              }`}
            >
              {isDraft ? t("draft") : t("sent")}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <InitialsAvatar name={employee.name} color={colorForIndex(avatarIndex)} />
            <div className="leading-tight">
              <div className="font-medium text-foreground">{employee.name}</div>
              <div className="text-xs text-muted-foreground">
                {employee.position} · {employee.email}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{t("employeeId")}</div>
            <div className="text-sm font-medium text-foreground">{employee.code}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-6">
          <div>
            <div className="mb-2 text-xs font-semibold tracking-wide text-[oklch(0.42_0.09_70)] uppercase">
              {t("earnings")}
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {computed.earnings.map((l) => (
                <div key={l.fieldId} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{l.label}</span>
                  <span className="font-medium text-success">
                    +{money(l.amount, activeClient.currency, locale)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-2 font-semibold text-foreground">
                <span>{t("grossPay")}</span>
                <span>{money(computed.gross, activeClient.currency, locale)}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold tracking-wide text-brand-clay uppercase">
              {t("deductions")}
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {computed.deductions.map((l) => (
                <div key={l.fieldId} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{l.label}</span>
                  <span className="font-medium text-destructive">
                    −{money(l.amount, activeClient.currency, locale)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-2 font-semibold text-destructive">
                <span>{t("totalDeductions")}</span>
                <span>−{money(computed.totalDeductions, activeClient.currency, locale)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-primary px-5 py-4 text-primary-foreground">
          <div>
            <div className="text-sm opacity-85">{t("netPayable")}</div>
            <div className="font-heading text-2xl font-semibold">
              {money(computed.net, activeClient.currency, locale)}
            </div>
          </div>
          <ReceiptText className="size-6 opacity-70" />
        </div>

        {computed.info.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("employeeInformation")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {computed.info.map((l) => (
                <div key={l.fieldId} className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">{l.label}</div>
                  <div className="text-sm font-medium text-foreground">{l.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("footerLine", { schoolName: activeClient.name, period: periodLabel(period, locale) })}
        </p>

        <div className="mt-2 flex items-center justify-between border-t border-border pt-4 print:hidden">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {isDraft ? (
              <>
                <Clock className="size-4" />
                {t("stillDraft")}
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4 text-success" />
                {t("delivered", { date: sentAt ? formatDate(sentAt, locale) : "" })}
              </>
            )}
          </div>
          {payslip && isDraft && (
            <Button size="sm" onClick={markSent}>
              {t("markAsSent")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
