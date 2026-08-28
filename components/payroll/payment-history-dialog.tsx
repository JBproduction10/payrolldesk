"use client";

import { useState, type ReactElement } from "react";
import { useTranslations, useLocale } from "next-intl";
import { History, Printer } from "lucide-react";
import { money, periodLabel, formatDate } from "@/lib/format";
import type { Currency, FeePayment } from "@/lib/types";
import { FeeStatusBadge } from "./status-badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function PaymentHistoryDialog({
  trigger,
  studentName,
  schoolName,
  monthlyFee,
  currency,
  payments,
}: {
  trigger: ReactElement;
  studentName: string;
  schoolName?: string;
  monthlyFee: number;
  currency: Currency;
  payments: FeePayment[];
}) {
  const t = useTranslations("paymentHistoryDialog");
  const locale = useLocale() as "en" | "fr";
  const [open, setOpen] = useState(false);
  const sorted = [...payments].sort((a, b) => (a.period < b.period ? 1 : -1));
  const lifetimeCollected = payments.reduce((sum, p) => sum + p.amountPaid, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md print:static print:max-h-none print:w-full print:max-w-none print:translate-x-0 print:translate-y-0 print:overflow-visible print:ring-0">
        <DialogHeader className="flex-row items-start justify-between">
          <div>
            <DialogTitle>
              {schoolName ? t("feeStatementWithSchool", { schoolName }) : t("feeStatement")}
            </DialogTitle>
            <DialogDescription>
              {t("description", {
                name: studentName,
                fee: money(monthlyFee, currency, locale),
                collected: money(lifetimeCollected, currency, locale),
              })}
            </DialogDescription>
          </div>
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

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <History className="size-6" />
            {t("noPayments")}
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto scrollbar-thin print:max-h-none print:overflow-visible">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="py-2 pr-2 font-medium">{t("columnPeriod")}</th>
                  <th className="py-2 pr-2 font-medium">{t("columnPaid")}</th>
                  <th className="py-2 pr-2 font-medium">{t("columnStatus")}</th>
                  <th className="py-2 font-medium">{t("columnDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-2 font-medium text-foreground">
                      {periodLabel(p.period, locale)}
                    </td>
                    <td className="py-2 pr-2 text-foreground">
                      {money(p.amountPaid, currency, locale)}
                      {p.amountDue !== p.amountPaid && p.status !== "social_case" && (
                        <span className="text-muted-foreground"> / {money(p.amountDue, currency, locale)}</span>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <FeeStatusBadge status={p.status} />
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {p.paidAt ? formatDate(p.paidAt, locale) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
