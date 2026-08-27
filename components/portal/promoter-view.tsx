"use client";

import { useState, Fragment } from "react";
import { Printer, ChevronDown, ChevronRight, PackageSearch, Truck, Receipt, TriangleAlert } from "lucide-react";
import { periodLabel, timeAgo } from "@/lib/format";
import type { Currency, Requisition, SupplyCategory } from "@/lib/types";
import { RequisitionStatusBadge } from "@/components/payroll/status-badges";
import { Button } from "@/components/ui/button";

interface Summary {
  clientId: string;
  name: string;
  currency: Currency;
  studentCount: number;
  feesCollected: number;
  feesOutstanding: number;
  totalSalary: number;
  expensesThisMonth: number;
  net: number;
}

interface SupplySummary {
  clientId: string;
  name: string;
  currency: Currency;
  unitsDelivered: number;
  unitsSold: number;
  unitsOnHand: number;
  revenue: number;
  varianceCount: number;
}

interface SupplyStockRow {
  category: SupplyCategory;
  itemLabel: string;
  delivered: number;
  sold: number;
  stock: number;
  revenue: number;
}

interface SupplyDeliveryRow {
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

interface SupplySaleRow {
  id: string;
  clientId: string;
  clientName: string;
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

interface InventoryVarianceRow {
  id: string;
  clientId: string;
  clientName: string;
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

type Outflow = Requisition & { clientName: string };

const SUPPLY_CATEGORY_LABEL: Record<SupplyCategory, string> = {
  uniform: "Uniform",
  shoes: "Shoes",
  sweater: "Sweater",
  other: "Other",
};

function money(n: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function PromoterView({
  summaries,
  period,
  outflows,
  supplySummaries,
  supplyStockByClient,
  recentSupplyDeliveries,
  recentSupplySales,
  inventoryVariances,
}: {
  summaries: Summary[];
  period: string;
  outflows: Outflow[];
  supplySummaries: SupplySummary[];
  supplyStockByClient: Record<string, SupplyStockRow[]>;
  recentSupplyDeliveries: SupplyDeliveryRow[];
  recentSupplySales: SupplySaleRow[];
  inventoryVariances: InventoryVarianceRow[];
}) {
  const totals = summaries.reduce(
    (acc, s) => ({
      students: acc.students + s.studentCount,
      collected: acc.collected + s.feesCollected,
      outstanding: acc.outstanding + s.feesOutstanding,
      salary: acc.salary + s.totalSalary,
      expenses: acc.expenses + s.expensesThisMonth,
      net: acc.net + s.net,
    }),
    { students: 0, collected: 0, outstanding: 0, salary: 0, expenses: 0, net: 0 },
  );
  const currency = summaries[0]?.currency ?? "USD";

  const supplyTotals = supplySummaries.reduce(
    (acc, s) => ({
      delivered: acc.delivered + s.unitsDelivered,
      sold: acc.sold + s.unitsSold,
      onHand: acc.onHand + s.unitsOnHand,
      revenue: acc.revenue + s.revenue,
      variances: acc.variances + s.varianceCount,
    }),
    { delivered: 0, sold: 0, onHand: 0, revenue: 0, variances: 0 },
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Group Balance Sheet
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Across all {summaries.length} schools · {periodLabel(period)}
          </p>
        </div>
        <Button
          variant="outline"
          className="print:hidden"
          onClick={() => window.print()}
        >
          <Printer className="size-4" />
          Print report
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {[
          ["Students", totals.students.toLocaleString()],
          ["Fees collected", money(totals.collected, currency)],
          ["Fees outstanding", money(totals.outstanding, currency)],
          ["Salaries", money(totals.salary, currency)],
          ["Expenses", money(totals.expenses, currency)],
          ["Net position", money(totals.net, currency)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 font-heading text-lg font-semibold text-foreground">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                <th className="px-4 py-3 font-medium">School</th>
                <th className="px-4 py-3 font-medium">Students</th>
                <th className="px-4 py-3 font-medium">Fees collected</th>
                <th className="px-4 py-3 font-medium">Fees outstanding</th>
                <th className="px-4 py-3 font-medium">Salaries</th>
                <th className="px-4 py-3 font-medium">Expenses</th>
                <th className="px-4 py-3 font-medium">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summaries.map((s) => (
                <tr key={s.clientId}>
                  <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.studentCount}</td>
                  <td className="px-4 py-3 text-success">
                    {money(s.feesCollected, s.currency)}
                  </td>
                  <td className="px-4 py-3 text-brand-clay">
                    {money(s.feesOutstanding, s.currency)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {money(s.totalSalary, s.currency)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {money(s.expensesThisMonth, s.currency)}
                  </td>
                  <td
                    className={`px-4 py-3 font-semibold ${s.net >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {money(s.net, s.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Net position = fees collected − salaries − expenses logged this period. This view
        is read-only.
      </p>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Treasury outflows
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every fund request Bonté Service has actually paid out, across every school.
        </p>

        {outflows.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border bg-card py-10 text-center text-sm text-muted-foreground">
            No payouts recorded yet.
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                    <th className="px-4 py-3 font-medium">School</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 font-medium">Paid</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {outflows.map((o) => {
                    const outflowCurrency =
                      summaries.find((s) => s.clientId === o.clientId)?.currency ?? "USD";
                    return (
                      <tr key={o.id}>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {o.clientName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{o.description}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {o.paymentMethod ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {money(o.paidAmount ?? 0, outflowCurrency)}
                        </td>
                        <td className="px-4 py-3">
                          <RequisitionStatusBadge status={o.status} />
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {o.paidAt ? timeAgo(o.paidAt) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-2">
          <PackageSearch className="size-5 text-muted-foreground" />
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Supplies & Logistics
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Stock Bonté Service has delivered, what each Intendance has sold, and every gap a
          physical count has turned up — across every school.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {[
            ["Units delivered", supplyTotals.delivered.toLocaleString()],
            ["Units sold", supplyTotals.sold.toLocaleString()],
            ["Units on hand", supplyTotals.onHand.toLocaleString()],
            ["Sales revenue", money(supplyTotals.revenue, currency)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-1 font-heading text-lg font-semibold text-foreground">
                {value}
              </div>
            </div>
          ))}
          <div
            className={`rounded-2xl border p-4 shadow-sm ${
              supplyTotals.variances > 0
                ? "border-destructive/30 bg-destructive/5"
                : "border-success/30 bg-success/5"
            }`}
          >
            <div className="text-xs text-muted-foreground">Discrepancies flagged</div>
            <div className="mt-1 font-heading text-lg font-semibold text-foreground">
              {supplyTotals.variances}
            </div>
          </div>
        </div>

        <SupplyStockByClient summaries={supplySummaries} stockByClient={supplyStockByClient} />

        {inventoryVariances.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-destructive" />
              <h3 className="font-heading text-base font-semibold text-foreground">
                Inventory discrepancies
              </h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Physical counts that didn't match what deliveries minus sales predicted — the
              signal Bonté Service's fund requests can't show you.
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {inventoryVariances.map((v) => (
                <div
                  key={v.id}
                  className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">
                      {v.clientName} — {v.itemLabel}
                    </span>
                    <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                      {v.variance > 0 ? "+" : ""}
                      {v.variance} vs expected
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Counted {v.countedQty} (expected {v.expectedQty}) on {v.countedAt} by{" "}
                    {v.countedBy}
                    {v.note ? ` — "${v.note}"` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-muted-foreground" />
              <h3 className="font-heading text-base font-semibold text-foreground">
                Recent deliveries
              </h3>
            </div>
            {recentSupplyDeliveries.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-border bg-card py-8 text-center text-sm text-muted-foreground">
                No deliveries logged yet.
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {recentSupplyDeliveries.map((d) => (
                  <div key={d.id} className="rounded-xl border border-border bg-card p-3 text-sm shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {d.clientName} — {d.quantity}× {d.itemLabel}
                      </span>
                      <span className="text-xs text-muted-foreground">{timeAgo(d.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {SUPPLY_CATEGORY_LABEL[d.category]} · ref {d.reference} · delivered{" "}
                      {d.deliveredAt}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground" />
              <h3 className="font-heading text-base font-semibold text-foreground">
                Recent sales
              </h3>
            </div>
            {recentSupplySales.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-border bg-card py-8 text-center text-sm text-muted-foreground">
                No sales recorded yet.
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {recentSupplySales.map((s) => {
                  const saleCurrency =
                    supplySummaries.find((sm) => sm.clientId === s.clientId)?.currency ?? "USD";
                  return (
                    <div key={s.id} className="rounded-xl border border-border bg-card p-3 text-sm shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-foreground">
                          {s.clientName} — {s.quantity}× {s.itemLabel}
                        </span>
                        <span className="font-semibold text-foreground">
                          {money(s.totalAmount, saleCurrency)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Sold to {s.buyerName} on {s.soldAt}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SupplyStockByClient({
  summaries,
  stockByClient,
}: {
  summaries: SupplySummary[];
  stockByClient: Record<string, SupplyStockRow[]>;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(clientId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">School</th>
              <th className="px-4 py-3 font-medium">Delivered</th>
              <th className="px-4 py-3 font-medium">Sold</th>
              <th className="px-4 py-3 font-medium">On hand</th>
              <th className="px-4 py-3 font-medium">Revenue</th>
              <th className="px-4 py-3 font-medium">Discrepancies</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {summaries.map((s) => {
              const isOpen = expanded.has(s.clientId);
              const rows = stockByClient[s.clientId] ?? [];
              return (
                <Fragment key={s.clientId}>
                  <tr
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => toggle(s.clientId)}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      <span className="flex items-center gap-1.5">
                        {isOpen ? (
                          <ChevronDown className="size-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-3.5 text-muted-foreground" />
                        )}
                        {s.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.unitsDelivered}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.unitsSold}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{s.unitsOnHand}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {money(s.revenue, s.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {s.varianceCount > 0 ? (
                        <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                          {s.varianceCount}
                        </span>
                      ) : (
                        <span className="rounded-full bg-success/12 px-2.5 py-1 text-xs font-medium text-success">
                          None
                        </span>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={6} className="bg-muted/20 px-4 py-3">
                        {rows.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No stock on record for {s.name} yet.
                          </p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-muted-foreground">
                                <th className="py-1.5 pr-4 font-medium">Item</th>
                                <th className="py-1.5 pr-4 font-medium">Category</th>
                                <th className="py-1.5 pr-4 font-medium">Delivered</th>
                                <th className="py-1.5 pr-4 font-medium">Sold</th>
                                <th className="py-1.5 pr-4 font-medium">On hand</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((r) => (
                                <tr key={`${r.category}::${r.itemLabel}`} className="border-t border-border/60">
                                  <td className="py-1.5 pr-4 text-foreground">{r.itemLabel}</td>
                                  <td className="py-1.5 pr-4 text-muted-foreground">
                                    {SUPPLY_CATEGORY_LABEL[r.category]}
                                  </td>
                                  <td className="py-1.5 pr-4 text-foreground">{r.delivered}</td>
                                  <td className="py-1.5 pr-4 text-foreground">{r.sold}</td>
                                  <td className="py-1.5 pr-4 font-medium text-foreground">
                                    {r.stock}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
