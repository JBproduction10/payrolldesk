"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { usePayroll } from "@/lib/store";
import type { Client, Currency } from "@/lib/types";
import type { BrandColorKey } from "@/lib/colors";
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
import { ColorSwatchPicker } from "./color-swatch-picker";

const CURRENCIES: Currency[] = ["USD", "GBP", "EUR", "NGN", "KES", "ZAR", "GHS", "CDF"];

interface FormState {
  name: string;
  domain: string;
  description: string;
  color: BrandColorKey;
  currency: Currency;
  payDay: string;
}

const EMPTY: FormState = {
  name: "",
  domain: "",
  description: "",
  color: "pine",
  currency: "USD",
  payDay: "28",
};

export function ClientFormDialog({
  trigger,
  client,
}: {
  trigger: ReactElement;
  client?: Client;
}) {
  const t = useTranslations("clientForm");
  const { addClient, updateClient } = usePayroll();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const isEdit = Boolean(client);

  useEffect(() => {
    if (!open) return;
    if (client) {
      setForm({
        name: client.name,
        domain: client.domain,
        description: client.description,
        color: (client.color as BrandColorKey) ?? "pine",
        currency: client.currency,
        payDay: String(client.payDay),
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, client]);

  const valid = form.name.trim().length > 0 && form.domain.trim().length > 0;

  function handleSubmit() {
    if (!valid) return;
    const payload = {
      name: form.name.trim(),
      domain: form.domain.trim().replace(/^@/, ""),
      description: form.description.trim(),
      color: form.color,
      currency: form.currency,
      payDay: Math.min(31, Math.max(1, Number(form.payDay) || 28)),
    };
    if (isEdit && client) {
      updateClient(client.id, payload);
      toast.add({ title: t("updatedToast", { name: payload.name }), type: "success" });
    } else {
      addClient(payload);
      toast.add({
        title: t("addedToast", { name: payload.name }),
        description: t("switchedDescription"),
        type: "success",
      });
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("editDescription")
              : t("addDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-name">{t("clientName")}</Label>
            <Input
              id="cf-name"
              placeholder={t("clientNamePlaceholder")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-domain">{t("emailDomain")}</Label>
            <Input
              id="cf-domain"
              placeholder="acme.io"
              value={form.domain}
              onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              {t("emailDomainHint", { domain: form.domain || "domain.com" })}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-desc">{t("description")}</Label>
            <Input
              id="cf-desc"
              placeholder={t("descriptionPlaceholder")}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cf-currency">{t("currency")}</Label>
              <NativeSelect
                id="cf-currency"
                className="w-full"
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value as Currency }))
                }
              >
                {CURRENCIES.map((c) => (
                  <NativeSelectOption key={c} value={c}>
                    {c}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cf-payday">{t("payDay")}</Label>
              <Input
                id="cf-payday"
                type="number"
                min={1}
                max={31}
                value={form.payDay}
                onChange={(e) => setForm((f) => ({ ...f, payDay: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t("brandColour")}</Label>
            <ColorSwatchPicker
              value={form.color}
              onChange={(c) => setForm((f) => ({ ...f, color: c }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!valid}>
            {isEdit ? t("saveChanges") : t("addClient")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
