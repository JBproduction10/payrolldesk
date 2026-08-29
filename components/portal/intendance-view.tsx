"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { PackageSearch, Truck, Receipt, ClipboardList, Plus } from "lucide-react";
import { timeAgo, money } from "@/lib/format";
import type { Client, Currency, SupplyCategory } from "@/lib/types";
import type { SupplyStockRow } from "@/lib/aggregate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
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

const SUPPLY_CATEGORIES: SupplyCategory[] = ["uniform", "shoes", "sweater", "other"];

export interface IntendanceDelivery {
  id: string;
  category: SupplyCategory;
  itemLabel: string;
  quantity: number;
  deliveredAt: string;
  reference: string;
  recordedBy: string;
  createdAt: string;
}

export interface IntendanceSale {
  id: string;
  category: SupplyCategory;
  itemLabel: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  buyerName: string;
  soldAt: string;
  recordedBy: string;
  createdAt: string;
}

export interface IntendanceInventoryCount {
  id: string;
  category: SupplyCategory;
  itemLabel: string;
  countedQty: number;
  expectedQty: number;
  variance: number;
  countedAt: string;
  countedBy: string;
  note: string;
  createdAt: string;
}

const TABS = ["stock", "sales", "deliveries", "counts"] as const;
type Tab = (typeof TABS)[number];

export function IntendanceView({
  client,
  stock,
  deliveries,
  sales,
  inventoryCounts,
  onRefresh,
}: {
  client: Client | null;
  stock: SupplyStockRow[];
  deliveries: IntendanceDelivery[];
  sales: IntendanceSale[];
  inventoryCounts: IntendanceInventoryCount[];
  onRefresh: () => void;
}) {
  const t = useTranslations("intendanceView");
  const [tab, setTab] = useState<Tab>("stock");
  // Known items (category + label) that already exist, from deliveries —
  // this is what the sale/count forms suggest, since Intendance never
  // creates an item on its own; it only ever moves stock that already
  // arrived from Bonté Service.
  const knownItems = stock.map((s) => ({ category: s.category, itemLabel: s.itemLabel }));

  const varianceCount = inventoryCounts.filter((c) => c.variance !== 0).length;

  const TAB_DEFS = [
    { key: "stock" as const, label: t("tabStock"), icon: PackageSearch },
    { key: "sales" as const, label: t("tabSales"), icon: Receipt },
    { key: "deliveries" as const, label: t("tabDeliveries"), icon: Truck },
    { key: "counts" as const, label: t("tabCounts"), icon: ClipboardList },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <PackageSearch className="size-6 text-muted-foreground" />
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{client?.name}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">{t("itemsTracked")}</div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            {stock.length}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">{t("unitsOnHand")}</div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            {stock.reduce((sum, s) => sum + s.stock, 0)}
          </div>
        </div>
        <div
          className={`rounded-2xl border p-4 shadow-sm ${
            varianceCount > 0
              ? "border-destructive/30 bg-destructive/5"
              : "border-success/30 bg-success/5"
          }`}
        >
          <div className="text-xs text-muted-foreground">{t("countsWithGap")}</div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            {varianceCount}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {TAB_DEFS.map((tItem) => (
            <button
              key={tItem.key}
              onClick={() => setTab(tItem.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === tItem.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tItem.icon className="size-3.5" />
              {tItem.label}
            </button>
          ))}
        </div>

        {tab === "sales" && <RecordSaleDialog knownItems={knownItems} onRefresh={onRefresh} />}
        {tab === "counts" && <RecordCountDialog knownItems={knownItems} onRefresh={onRefresh} />}
      </div>

      {tab === "stock" && <StockTable rows={stock} />}
      {tab === "sales" && <SalesList rows={sales} currency={client?.currency} />}
      {tab === "deliveries" && <DeliveriesList rows={deliveries} />}
      {tab === "counts" && <CountsList rows={inventoryCounts} />}
    </div>
  );
}

function useSupplyCategoryLabel() {
  const t = useTranslations("intendanceView");
  const map: Record<SupplyCategory, string> = {
    uniform: t("categoryUniform"),
    shoes: t("categoryShoes"),
    sweater: t("categorySweater"),
    other: t("categoryOther"),
  };
  return (c: SupplyCategory) => map[c];
}

function EmptyState({ icon: Icon, message }: { icon: typeof PackageSearch; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function StockTable({ rows }: { rows: SupplyStockRow[] }) {
  const t = useTranslations("intendanceView");
  const categoryLabel = useSupplyCategoryLabel();
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        message={t("noStockYet")}
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">{t("columnItem")}</th>
              <th className="px-4 py-3 font-medium">{t("columnCategory")}</th>
              <th className="px-4 py-3 font-medium">{t("columnDelivered")}</th>
              <th className="px-4 py-3 font-medium">{t("columnSold")}</th>
              <th className="px-4 py-3 font-medium">{t("columnOnHand")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.category}::${r.itemLabel}`} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{r.itemLabel}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {categoryLabel(r.category)}
                </td>
                <td className="px-4 py-3 text-foreground">{r.delivered}</td>
                <td className="px-4 py-3 text-foreground">{r.sold}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{r.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SalesList({ rows, currency }: { rows: IntendanceSale[]; currency?: Currency }) {
  const t = useTranslations("intendanceView");
  const locale = useLocale() as "en" | "fr";
  if (rows.length === 0) {
    return <EmptyState icon={Receipt} message={t("noSalesYet")} />;
  }
  return (
    <div className="flex flex-col gap-3">
      {rows.map((s) => (
        <div key={s.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-foreground">
              {s.quantity}× {s.itemLabel}
            </span>
            <span className="font-heading text-lg font-semibold text-foreground">
              {money(s.totalAmount, currency, locale)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("soldToLogged", { buyer: s.buyerName, date: s.soldAt, name: s.recordedBy, time: timeAgo(s.createdAt, locale) })}
          </p>
        </div>
      ))}
    </div>
  );
}

function DeliveriesList({ rows }: { rows: IntendanceDelivery[] }) {
  const t = useTranslations("intendanceView");
  const locale = useLocale() as "en" | "fr";
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        message={t("noDeliveriesYet")}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {rows.map((d) => (
        <div key={d.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-foreground">
              {d.quantity}× {d.itemLabel}
            </span>
            <span className="text-xs text-muted-foreground">{t("ref", { reference: d.reference })}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("deliveredByLogged", { date: d.deliveredAt, name: d.recordedBy, time: timeAgo(d.createdAt, locale) })}
          </p>
        </div>
      ))}
    </div>
  );
}

function CountsList({ rows }: { rows: IntendanceInventoryCount[] }) {
  const t = useTranslations("intendanceView");
  const locale = useLocale() as "en" | "fr";
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        message={t("noCountsYet")}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {rows.map((c) => (
        <div key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-foreground">{c.itemLabel}</span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                c.variance === 0
                  ? "bg-success/12 text-success"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {c.variance === 0
                ? t("matches")
                : t("vsExpectedShort", { variance: `${c.variance > 0 ? "+" : ""}${c.variance}` })}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("countedLine", { counted: c.countedQty, expected: c.expectedQty, date: c.countedAt, by: c.countedBy })}
            {c.note ? ` — "${c.note}"` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function RecordSaleDialog({
  knownItems,
  onRefresh,
}: {
  knownItems: { category: SupplyCategory; itemLabel: string }[];
  onRefresh: () => void;
}) {
  const t = useTranslations("intendanceView");
  const categoryLabel = useSupplyCategoryLabel();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<SupplyCategory>("uniform");
  const [itemLabel, setItemLabel] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [soldAt, setSoldAt] = useState(() => new Date().toISOString().slice(0, 10));

  const valid =
    itemLabel.trim() &&
    Number(quantity) > 0 &&
    Number(unitPrice) >= 0 &&
    buyerName.trim() &&
    soldAt;

  function reset() {
    setCategory("uniform");
    setItemLabel("");
    setQuantity("");
    setUnitPrice("");
    setBuyerName("");
    setSoldAt(new Date().toISOString().slice(0, 10));
  }

  async function handleSubmit() {
    if (!valid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/portal/supplies/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          itemLabel: itemLabel.trim(),
          quantity: Number(quantity),
          unitPrice: Number(unitPrice),
          buyerName: buyerName.trim(),
          soldAt,
        }),
      });
      if (res.ok) {
        toast.add({ title: t("saleRecordedToast"), type: "success" });
        setOpen(false);
        reset();
        onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.add({ title: data.error || t("saleFailedToast"), type: "error" });
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
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-3.5" />
            {t("recordSale")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("recordSaleTitle")}</DialogTitle>
          <DialogDescription>{t("recordSaleDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rs-category">{t("category")}</Label>
            <NativeSelect
              id="rs-category"
              className="w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value as SupplyCategory)}
            >
              {SUPPLY_CATEGORIES.map((c) => (
                <NativeSelectOption key={c} value={c}>
                  {categoryLabel(c)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rs-qty">{t("quantity")}</Label>
            <Input
              id="rs-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="rs-item">{t("item")}</Label>
            <Input
              id="rs-item"
              list="rs-item-options"
              placeholder={t("itemPlaceholder")}
              value={itemLabel}
              onChange={(e) => setItemLabel(e.target.value)}
            />
            <datalist id="rs-item-options">
              {knownItems
                .filter((k) => k.category === category)
                .map((k) => (
                  <option key={k.itemLabel} value={k.itemLabel} />
                ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rs-price">{t("unitPrice")}</Label>
            <Input
              id="rs-price"
              type="number"
              min={0}
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rs-date">{t("soldOn")}</Label>
            <Input
              id="rs-date"
              type="date"
              value={soldAt}
              onChange={(e) => setSoldAt(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="rs-buyer">{t("buyer")}</Label>
            <Input
              id="rs-buyer"
              placeholder={t("buyerPlaceholder")}
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? t("recording") : t("recordSale")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordCountDialog({
  knownItems,
  onRefresh,
}: {
  knownItems: { category: SupplyCategory; itemLabel: string }[];
  onRefresh: () => void;
}) {
  const t = useTranslations("intendanceView");
  const categoryLabel = useSupplyCategoryLabel();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<SupplyCategory>("uniform");
  const [itemLabel, setItemLabel] = useState("");
  const [countedQty, setCountedQty] = useState("");
  const [countedAt, setCountedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const valid = itemLabel.trim() && countedQty !== "" && Number(countedQty) >= 0 && countedAt;

  function reset() {
    setCategory("uniform");
    setItemLabel("");
    setCountedQty("");
    setCountedAt(new Date().toISOString().slice(0, 10));
    setNote("");
  }

  async function handleSubmit() {
    if (!valid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/portal/supplies/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          itemLabel: itemLabel.trim(),
          countedQty: Number(countedQty),
          countedAt,
          note: note.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast.add({ title: t("countRecordedToast"), type: "success" });
        setOpen(false);
        reset();
        onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.add({ title: data.error || t("countFailedToast"), type: "error" });
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
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-3.5" />
            {t("logCount")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("logCountTitle")}</DialogTitle>
          <DialogDescription>
            {t("logCountDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rc-category">{t("category")}</Label>
            <NativeSelect
              id="rc-category"
              className="w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value as SupplyCategory)}
            >
              {SUPPLY_CATEGORIES.map((c) => (
                <NativeSelectOption key={c} value={c}>
                  {categoryLabel(c)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rc-qty">{t("countedQuantity")}</Label>
            <Input
              id="rc-qty"
              type="number"
              min={0}
              value={countedQty}
              onChange={(e) => setCountedQty(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="rc-item">{t("item")}</Label>
            <Input
              id="rc-item"
              list="rc-item-options"
              placeholder={t("itemPlaceholder")}
              value={itemLabel}
              onChange={(e) => setItemLabel(e.target.value)}
            />
            <datalist id="rc-item-options">
              {knownItems
                .filter((k) => k.category === category)
                .map((k) => (
                  <option key={k.itemLabel} value={k.itemLabel} />
                ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rc-date">{t("countedOn")}</Label>
            <Input
              id="rc-date"
              type="date"
              value={countedAt}
              onChange={(e) => setCountedAt(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="rc-note">{t("note")}</Label>
            <Textarea id="rc-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? t("recording") : t("logCount")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
