"use client";

import { useState, type ReactElement } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Send } from "lucide-react";
import type { Employee } from "@/lib/types";
import { money, periodLabel } from "@/lib/format";
import { colorForIndex } from "@/lib/colors";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { InitialsAvatar } from "./initials-avatar";
import type { Currency } from "@/lib/types";

export function ConfirmSendDialog({
  trigger,
  employee,
  netPay,
  currency,
  period,
  channels,
  avatarIndex = 0,
  onConfirm,
}: {
  trigger: ReactElement;
  employee: Employee;
  netPay: number;
  currency: Currency;
  period: string;
  channels: string[];
  avatarIndex?: number;
  onConfirm: () => void;
}) {
  const t = useTranslations("confirmSendDialog");
  const locale = useLocale() as "en" | "fr";
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <InitialsAvatar name={employee.name} color={colorForIndex(avatarIndex)} />
            <div className="leading-tight">
              <div className="font-medium text-foreground">{employee.name}</div>
              <div className="text-xs text-muted-foreground">{employee.position}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{t("netPay")}</div>
            <div className="font-semibold text-success">{money(netPay, currency, locale)}</div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("sendPrompt", { period: periodLabel(period, locale) })}{" "}
          <span className="font-medium text-foreground">
            {channels.includes("whatsapp") ? t("andWhatsApp", { email: employee.email }) : employee.email}
          </span>
          {t("confirmSuffix")}
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            <Send className="size-3.5" />
            {t("confirmSend")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
