"use client";

import { useState } from "react";
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

const SUPPLY_CATEGORY_LABEL: Record<SupplyCategory, string> = {
  uniform: "Uniform",
  shoes: "Shoes",
  sweater: "Sweater",
  other: "Other",
};

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
  const [tab, setTab] = useState<Tab>("stock");
  // Known items (category + label) that already exist, from deliveries —
  // this is what the sale/count forms suggest, since Intendance never
  // creates an item on its own; it only ever moves stock that already
  // arrived from Bonté Service.
  const knownItems = stock.map((s) => ({ category: s.category, itemLabel: s.itemLabel }));

  const varianceCount = inventoryCounts.filter((c) => c.variance !== 0).length;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <PackageSearch className="size-6 text-muted-foreground" />
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Intendance & Logistics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{client?.name}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">Items tracked</div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            {stock.length}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">Units on hand</div>
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
          <div className="text-xs text-muted-foreground">Counts with a gap</div>
          <div className="mt-1 font-heading text-lg font-semibold text-foreground">
            {varianceCount}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {[
            { key: "stock" as const, label: "Stock", icon: PackageSearch },
            { key: "sales" as const, label: "Sales", icon: Receipt },
            { key: "deliveries" as const, label: "Deliveries received", icon: Truck },
            { key: "counts" as const, label: "Inventory counts", icon: ClipboardList },
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

function EmptyState({ icon: Icon, message }: { icon: typeof PackageSearch; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function StockTable({ rows }: { rows: SupplyStockRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        message="No stock on record yet — it appears here once Bonté Service logs a delivery to your school."
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Delivered</th>
              <th className="px-4 py-3 font-medium">Sold</th>
              <th className="px-4 py-3 font-medium">On hand</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.category}::${r.itemLabel}`} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{r.itemLabel}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {SUPPLY_CATEGORY_LABEL[r.category]}
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
  if (rows.length === 0) {
    return <EmptyState icon={Receipt} message="No sales recorded yet." />;
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
              {money(s.totalAmount, currency)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Sold to {s.buyerName} on {s.soldAt} · logged by {s.recordedBy} · {timeAgo(s.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

function DeliveriesList({ rows }: { rows: IntendanceDelivery[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        message="Nothing delivered yet. Bonté Service logs deliveries on their end — you don't need to request or enter them here."
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
            <span className="text-xs text-muted-foreground">ref {d.reference}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Delivered {d.deliveredAt} by {d.recordedBy} · {timeAgo(d.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

function CountsList({ rows }: { rows: IntendanceInventoryCount[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        message="No inventory counts logged yet. Do one periodically to check the physical stock against what's expected."
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
                ? "Matches"
                : `${c.variance > 0 ? "+" : ""}${c.variance} vs expected`}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Counted {c.countedQty} (expected {c.expectedQty}) on {c.countedAt} by {c.countedBy}
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
        toast.add({ title: "Sale recorded", type: "success" });
        setOpen(false);
        reset();
        onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.add({ title: data.error || "Could not record this sale", type: "error" });
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
            Record sale
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a sale</DialogTitle>
          <DialogDescription>Sell against stock already delivered to your school.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rs-category">Category *</Label>
            <NativeSelect
              id="rs-category"
              className="w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value as SupplyCategory)}
            >
              {(Object.keys(SUPPLY_CATEGORY_LABEL) as SupplyCategory[]).map((c) => (
                <NativeSelectOption key={c} value={c}>
                  {SUPPLY_CATEGORY_LABEL[c]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rs-qty">Quantity *</Label>
            <Input
              id="rs-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="rs-item">Item *</Label>
            <Input
              id="rs-item"
              list="rs-item-options"
              placeholder="e.g. Uniform — Size M"
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
            <Label htmlFor="rs-price">Unit price *</Label>
            <Input
              id="rs-price"
              type="number"
              min={0}
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rs-date">Sold on *</Label>
            <Input
              id="rs-date"
              type="date"
              value={soldAt}
              onChange={(e) => setSoldAt(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="rs-buyer">Buyer *</Label>
            <Input
              id="rs-buyer"
              placeholder="Student or guardian name"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? "Recording…" : "Record sale"}
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
        toast.add({ title: "Count recorded", type: "success" });
        setOpen(false);
        reset();
        onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.add({ title: data.error || "Could not record this count", type: "error" });
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
            Log count
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log an inventory count</DialogTitle>
          <DialogDescription>
            Compares your physical count against what's expected from deliveries minus sales.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rc-category">Category *</Label>
            <NativeSelect
              id="rc-category"
              className="w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value as SupplyCategory)}
            >
              {(Object.keys(SUPPLY_CATEGORY_LABEL) as SupplyCategory[]).map((c) => (
                <NativeSelectOption key={c} value={c}>
                  {SUPPLY_CATEGORY_LABEL[c]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rc-qty">Counted quantity *</Label>
            <Input
              id="rc-qty"
              type="number"
              min={0}
              value={countedQty}
              onChange={(e) => setCountedQty(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="rc-item">Item *</Label>
            <Input
              id="rc-item"
              list="rc-item-options"
              placeholder="e.g. Uniform — Size M"
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
            <Label htmlFor="rc-date">Counted on *</Label>
            <Input
              id="rc-date"
              type="date"
              value={countedAt}
              onChange={(e) => setCountedAt(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="rc-note">Note</Label>
            <Textarea id="rc-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || loading}>
            {loading ? "Recording…" : "Log count"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
