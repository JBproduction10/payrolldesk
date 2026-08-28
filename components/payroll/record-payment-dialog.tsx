"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePayroll } from "@/lib/store";
import type { FeePayment, FeeStatus, Student } from "@/lib/types";
import { money, periodLabel } from "@/lib/format";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

function statusForAmount(amount: number, fee: number): FeeStatus {
  if (amount <= 0) return "unpaid";
  if (amount >= fee) return "paid";
  return "partial";
}

export function RecordPaymentDialog({
  trigger,
  student,
  period,
  payment,
}: {
  trigger: ReactElement;
  student: Student;
  period: string;
  /** This student's existing payment record for `period`, if one exists yet. */
  payment?: FeePayment;
}) {
  const t = useTranslations("recordPaymentDialog");
  const locale = useLocale() as "en" | "fr";
  const { activeClient, recordPayment } = usePayroll();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(payment?.amountPaid ?? 0));
  const [status, setStatus] = useState<FeeStatus>(payment?.status ?? "unpaid");

  useEffect(() => {
    if (!open) return;
    setAmount(String(payment?.amountPaid ?? 0));
    setStatus(payment?.status ?? "unpaid");
  }, [open, payment]);

  function handleAmountChange(value: string) {
    setAmount(value);
    const n = Number(value);
    if (!Number.isNaN(n) && status !== "social_case") {
      setStatus(statusForAmount(n, student.monthlyFee));
    }
  }

  function handleSubmit() {
    const n = Math.max(0, Number(amount) || 0);
    recordPayment(student.id, period, n, status);
    toast.add({
      title: t("recordedToast", { period: periodLabel(period, locale), name: student.name }),
      type: "success",
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", {
              name: student.name,
              className: student.className,
              period: periodLabel(period, locale),
              fee: money(student.monthlyFee, activeClient.currency, locale),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-amount">{t("amountPaid", { currency: activeClient.currency })}</Label>
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
              <NativeSelectOption value="social_case">
                {t("statusSocialCase")}
              </NativeSelectOption>
            </NativeSelect>
            <p className="text-xs text-muted-foreground">
              {t("statusHint")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit}>{t("savePayment")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
