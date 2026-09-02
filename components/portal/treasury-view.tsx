"use client";

import { useState, type ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Check, X, Wallet, Clock, CircleCheck, Landmark, Truck, Plus } from "lucide-react";
import { money, periodLabel, timeAgo } from "@/lib/format";
import type { Currency, RequisitionCategory, RequisitionStatus, SupplyCategory } from "@/lib/types";
import { RequisitionStatusBadge } from "@/components/payroll/status-badges";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

export interface TreasuryRequisition {
  id: string;
  clientId: string;
  clientName: string;
  category: RequisitionCategory;
  description: string;
  amountRequested: number;
  period?: string;
  status: RequisitionStatus;
  submittedBy: string;
  submittedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
  paidAmount?: number;
  paidAt?: string;
  paymentMethod?: string;
}

export interface TreasuryDelivery {
  id: string;
  clientId: string;
  clientName: string;
  category: SupplyCategory;
  itemLabel: string;
  quantity: number;
  deliveredAt: string;
  reference: string;
  recordedBy: string;
  createdAt: string;
}

interface ClientRef {
  id: string;
  name: string;
  currency: Currency;
}

const TABS = ["pending", "approved", "history", "deliveries"] as const;
type Tab = (typeof TABS)[number];

export function TreasuryView({
  clients,
  requisitions,
  deliveries,
  period,
  onRefresh,
}: {
  clients: ClientRef[];
  requisitions: TreasuryRequisition[];
  deliveries: TreasuryDelivery[];
  period: string;
  onRefresh: () => void;
}) {
  const t = useTranslations("treasuryView");
  const locale = useLocale() as "en" | "fr";
  const [tab, setTab] = useState<Tab>("pending");
  const currencyFor = new Map(clients.map((c) => [c.id, c.currency]));

  const pending = requisitions.filter((r) => r.status === "pending");
  const approved = requisitions.filter((r) => r.status === "approved");
  const history = requisitions.filter((r) => r.status === "paid" || r.status === "rejected");

  const totalPendingByClient = new Map<string, number>();
  for (const r of pending) {
    totalPendingByClient.set(
      r.clientId,
      (totalPendingByClient.get(r.clientId) ?? 0) + r.amountRequested,
    );
  }
  const totalPaidAllTime = requisitions
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + (r.paidAmount ?? 0), 0);

  const TAB_DEFS = [
    { key: "pending" as const, label: t("tabPending"), icon: Clock, count: pending.length },
    { key: "approved" as const, label: t("tabApproved"), icon: Check, count: approved.length },
    { key: "history" as const, label: t("tabHistory"), icon: CircleCheck, count: history.length },
    { key: "deliveries" as const, label: t("tabDeliveries"), icon: Truck, count: deliveries.length },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Landmark className="size-6 text-muted-foreground" />
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle", { count: clients.length, period: periodLabel(period, locale) })}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">{t("awaitingDecision")}</div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            {pending.length}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">{t("approvedNotPaid")}</div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            {approved.length}
          </div>
        </div>
        <div className="rounded-2xl border border-success/30 bg-success/5 p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">{t("paidAllTime")}</div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            {money(totalPaidAllTime, "USD", locale)}
          </div>
        </div>
      </div>

      <div className="lg:flex lg:items-start lg:gap-6">
        <PortalSectionNav
          items={TAB_DEFS.map((d) => ({ ...d, badge: d.count > 0 ? d.count : undefined }))}
          value={tab}
          onChange={setTab}
        />

        <div className="min-w-0 flex-1">
      {tab === "pending" && (
        <RequisitionList
          rows={pending}
          currencyFor={currencyFor}
          onRefresh={onRefresh}
          render={(r) => <DecideActions requisition={r} onRefresh={onRefresh} />}
        />
      )}
      {tab === "approved" && (
        <RequisitionList
          rows={approved}
          currencyFor={currencyFor}
          onRefresh={onRefresh}
          render={(r) => <MarkPaidAction requisition={r} onRefresh={onRefresh} />}
        />
      )}
      {tab === "history" && (
        <RequisitionList rows={history} currencyFor={currencyFor} onRefresh={onRefresh} />
      )}
      {tab === "deliveries" && (
        <DeliveriesPanel clients={clients} deliveries={deliveries} onRefresh={onRefresh} />
      )}
        </div>
      </div>
    </div>
  );
}

function RequisitionList({
  rows,
  currencyFor,
  render,
}: {
  rows: TreasuryRequisition[];
  currencyFor: Map<string, Currency>;
  onRefresh: () => void;
  render?: (r: TreasuryRequisition) => ReactNode;
}) {
  const t = useTranslations("treasuryView");
  const locale = useLocale() as "en" | "fr";
  const categoryLabel = (c: RequisitionCategory) =>
    c === "payroll" ? t("categoryPayroll") : t("categoryFundRequest");
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
        <Wallet className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("nothingHere")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => {
        const currency = currencyFor.get(r.clientId) ?? "USD";
        return (
          <div
            key={r.id}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{r.clientName}</span>
                <span className="text-xs text-muted-foreground">
                  {categoryLabel(r.category)}
                  {r.period ? ` · ${periodLabel(r.period, locale)}` : ""}
                </span>
                <RequisitionStatusBadge status={r.status} />
              </div>
              <p className="mt-1 text-sm text-foreground">{r.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("requestedBy", { name: r.submittedBy, time: timeAgo(r.submittedAt, locale) })}
                {r.decidedBy &&
                  (r.status === "rejected"
                    ? t("rejectedBy", { name: r.decidedBy })
                    : t("approvedBy", { name: r.decidedBy }))}
                {r.paidAt &&
                  t("paidLine", {
                    amount: money(r.paidAmount ?? 0, currency, locale),
                    method: r.paymentMethod ?? "",
                    time: timeAgo(r.paidAt, locale),
                  })}
                {r.decisionNote && ` — "${r.decisionNote}"`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-heading text-lg font-semibold text-foreground">
                {money(r.amountRequested, currency, locale)}
              </span>
              {render?.(r)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DecideActions({
  requisition,
  onRefresh,
}: {
  requisition: TreasuryRequisition;
  onRefresh: () => void;
}) {
  const t = useTranslations("treasuryView");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  async function decide(action: "approve" | "reject") {
    setLoading(action);
    try {
      const res = await fetch(`/api/portal/requisitions/${requisition.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });
      if (res.ok) {
        toast.add({
          title: action === "approve" ? t("requisitionApprovedToast") : t("requisitionRejectedToast"),
          type: "success",
        });
        setOpen(false);
        onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.add({ title: data.error || t("requisitionUpdateFailedToast"), type: "error" });
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
              <X className="size-3.5" />
              {t("reject")}
            </Button>
          }
        />
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("rejectTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reject-note">{t("rejectReasonLabel")}</Label>
            <Input id="reject-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={loading !== null}
              onClick={() => decide("reject")}
            >
              {loading === "reject" ? t("rejecting") : t("reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button size="sm" disabled={loading !== null} onClick={() => decide("approve")}>
        <Check className="size-3.5" />
        {loading === "approve" ? t("approving") : t("approve")}
      </Button>
    </div>
  );
}

function MarkPaidAction({
  requisition,
  onRefresh,
}: {
  requisition: TreasuryRequisition;
  onRefresh: () => void;
}) {
  const t = useTranslations("treasuryView");
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(requisition.amountRequested));
  const [method, setMethod] = useState("");
  const [loading, setLoading] = useState(false);

  const valid = Number(amount) > 0 && method.trim();

  async function handleSubmit() {
    if (!valid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/requisitions/${requisition.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pay",
          paidAmount: Number(amount),
          paymentMethod: method.trim(),
        }),
      });
      if (res.ok) {
        toast.add({ title: t("markedPaidToast"), type: "success" });
        setOpen(false);
        onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.add({ title: data.error || t("payoutFailedToast"), type: "error" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Wallet className="size-3.5" />{t("markPaid")}</Button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("recordPayoutTitle", { name: requisition.clientName })}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-amount">{t("amountActuallyPaid")}</Label>
            <Input
              id="pay-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-method">{t("paymentMethod")}</Label>
            <Input
              id="pay-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              placeholder={t("paymentMethodPlaceholder")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? t("recording") : t("confirmPayout")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeliveriesPanel({
  clients,
  deliveries,
  onRefresh,
}: {
  clients: ClientRef[];
  deliveries: TreasuryDelivery[];
  onRefresh: () => void;
}) {
  const t = useTranslations("treasuryView");
  const locale = useLocale() as "en" | "fr";
  const categoryLabel = (c: SupplyCategory): string => {
    const map: Record<SupplyCategory, string> = {
      uniform: t("categoryUniform"),
      shoes: t("categoryShoes"),
      sweater: t("categorySweater"),
      other: t("categoryOther"),
    };
    return map[c];
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <LogDeliveryDialog clients={clients} onRefresh={onRefresh} />
      </div>

      {deliveries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <Truck className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t("nothingDelivered")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {deliveries.map((d) => (
            <div
              key={d.id}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{d.clientName}</span>
                  <span className="text-xs text-muted-foreground">
                    {categoryLabel(d.category)} · ref {d.reference}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground">{d.itemLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("deliveredLogged", { date: d.deliveredAt, name: d.recordedBy, time: timeAgo(d.createdAt, locale) })}
                </p>
              </div>
              <span className="shrink-0 font-heading text-lg font-semibold text-foreground">
                {t("units", { count: d.quantity })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LogDeliveryDialog({
  clients,
  onRefresh,
}: {
  clients: ClientRef[];
  onRefresh: () => void;
}) {
  const t = useTranslations("treasuryView");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [category, setCategory] = useState<SupplyCategory>("uniform");
  const [itemLabel, setItemLabel] = useState("");
  const [quantity, setQuantity] = useState("");
  const [deliveredAt, setDeliveredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");

  const valid =
    clientId && itemLabel.trim() && Number(quantity) > 0 && deliveredAt && reference.trim();

  function reset() {
    setCategory("uniform");
    setItemLabel("");
    setQuantity("");
    setDeliveredAt(new Date().toISOString().slice(0, 10));
    setReference("");
  }

  async function handleSubmit() {
    if (!valid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/portal/supplies/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          category,
          itemLabel: itemLabel.trim(),
          quantity: Number(quantity),
          deliveredAt,
          reference: reference.trim(),
        }),
      });
      if (res.ok) {
        toast.add({ title: t("deliveryLoggedToast"), type: "success" });
        setOpen(false);
        reset();
        onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.add({ title: data.error || t("deliveryFailedToast"), type: "error" });
      }
    } finally {
      setLoading(false);
    }
  }

  const SUPPLY_CATEGORIES: { value: SupplyCategory; labelKey: string }[] = [
    { value: "uniform", labelKey: "categoryUniform" },
    { value: "shoes", labelKey: "categoryShoes" },
    { value: "sweater", labelKey: "categorySweater" },
    { value: "other", labelKey: "categoryOther" },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-3.5" />
            {t("logDelivery")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("logDeliveryTitle")}</DialogTitle>
          <DialogDescription>
            {t("logDeliveryDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="dd-client">{t("school")}</Label>
            <NativeSelect
              id="dd-client"
              className="w-full"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              {clients.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dd-category">{t("category")}</Label>
            <NativeSelect
              id="dd-category"
              className="w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value as SupplyCategory)}
            >
              {SUPPLY_CATEGORIES.map((c) => (
                <NativeSelectOption key={c.value} value={c.value}>
                  {t(c.labelKey)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dd-qty">{t("quantity")}</Label>
            <Input
              id="dd-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="dd-item">{t("item")}</Label>
            <Input
              id="dd-item"
              placeholder={t("itemPlaceholder")}
              value={itemLabel}
              onChange={(e) => setItemLabel(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dd-date">{t("deliveredOn")}</Label>
            <Input
              id="dd-date"
              type="date"
              value={deliveredAt}
              onChange={(e) => setDeliveredAt(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dd-ref">{t("reference")}</Label>
            <Input
              id="dd-ref"
              placeholder={t("referencePlaceholder")}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? t("logging") : t("logDelivery")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
