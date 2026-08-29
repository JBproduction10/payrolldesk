"use client";

import { useState, Fragment } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Printer, ChevronDown, ChevronRight, PackageSearch, Truck, Receipt, TriangleAlert } from "lucide-react";
import { money as formatMoney, periodLabel, timeAgo, formatDate } from "@/lib/format";
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

function money(n: number, currency: Currency, locale: "en" | "fr" = "en") {
  return formatMoney(n, currency, locale);
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
  const t = useTranslations("promoterView");
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
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle", { count: summaries.length, period: periodLabel(period, locale) })}
          </p>
        </div>
        <Button
          variant="outline"
          className="print:hidden"
          onClick={() => window.print()}
        >
          <Printer className="size-4" />
          {t("printReport")}
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {[
          [t("students"), totals.students.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")],
          [t("feesCollected"), money(totals.collected, currency, locale)],
          [t("feesOutstanding"), money(totals.outstanding, currency, locale)],
          [t("salaries"), money(totals.salary, currency, locale)],
          [t("expenses"), money(totals.expenses, currency, locale)],
          [t("netPosition"), money(totals.net, currency, locale)],
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
                <th className="px-4 py-3 font-medium">{t("columnSchool")}</th>
                <th className="px-4 py-3 font-medium">{t("columnStudents")}</th>
                <th className="px-4 py-3 font-medium">{t("columnFeesCollected")}</th>
                <th className="px-4 py-3 font-medium">{t("columnFeesOutstanding")}</th>
                <th className="px-4 py-3 font-medium">{t("columnSalaries")}</th>
                <th className="px-4 py-3 font-medium">{t("columnExpenses")}</th>
                <th className="px-4 py-3 font-medium">{t("columnNet")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summaries.map((s) => (
                <tr key={s.clientId}>
                  <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.studentCount}</td>
                  <td className="px-4 py-3 text-success">
                    {money(s.feesCollected, s.currency, locale)}
                  </td>
                  <td className="px-4 py-3 text-brand-clay">
                    {money(s.feesOutstanding, s.currency, locale)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {money(s.totalSalary, s.currency, locale)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {money(s.expensesThisMonth, s.currency, locale)}
                  </td>
                  <td
                    className={`px-4 py-3 font-semibold ${s.net >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {money(s.net, s.currency, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {t("netPositionFootnote")}
      </p>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {t("treasuryOutflows")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("treasuryOutflowsSubtitle")}
        </p>

        {outflows.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border bg-card py-10 text-center text-sm text-muted-foreground">
            {t("noPayoutsYet")}
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                    <th className="px-4 py-3 font-medium">{t("columnSchool")}</th>
                    <th className="px-4 py-3 font-medium">{t("columnDescription")}</th>
                    <th className="px-4 py-3 font-medium">{t("columnMethod")}</th>
                    <th className="px-4 py-3 font-medium">{t("columnPaid")}</th>
                    <th className="px-4 py-3 font-medium">{t("columnStatus")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("columnWhen")}</th>
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
                          {money(o.paidAmount ?? 0, outflowCurrency, locale)}
                        </td>
                        <td className="px-4 py-3">
                          <RequisitionStatusBadge status={o.status} />
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {o.paidAt ? timeAgo(o.paidAt, locale) : "—"}
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
            {t("suppliesLogistics")}
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("suppliesSubtitle")}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {[
            [t("unitsDelivered"), supplyTotals.delivered.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")],
            [t("unitsSold"), supplyTotals.sold.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")],
            [t("unitsOnHand"), supplyTotals.onHand.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")],
            [t("salesRevenue"), money(supplyTotals.revenue, currency, locale)],
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
            <div className="text-xs text-muted-foreground">{t("discrepanciesFlagged")}</div>
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
                {t("inventoryDiscrepancies")}
              </h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("inventoryDiscrepanciesSubtitle")}
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
                      {v.variance} {t("vsExpected")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("countedLine", {
                      counted: v.countedQty,
                      expected: v.expectedQty,
                      date: formatDate(v.countedAt, locale),
                      by: v.countedBy,
                    })}
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
                {t("recentDeliveries")}
              </h3>
            </div>
            {recentSupplyDeliveries.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-border bg-card py-8 text-center text-sm text-muted-foreground">
                {t("noDeliveriesYet")}
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {recentSupplyDeliveries.map((d) => (
                  <div key={d.id} className="rounded-xl border border-border bg-card p-3 text-sm shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {d.clientName} — {d.quantity}× {d.itemLabel}
                      </span>
                      <span className="text-xs text-muted-foreground">{timeAgo(d.createdAt, locale)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {categoryLabel(d.category)} · ref {d.reference} · {t("deliveredOn", { date: d.deliveredAt })}
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
                {t("recentSales")}
              </h3>
            </div>
            {recentSupplySales.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-border bg-card py-8 text-center text-sm text-muted-foreground">
                {t("noSalesYet")}
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
                          {money(s.totalAmount, saleCurrency, locale)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t("soldToOn", { buyer: s.buyerName, date: s.soldAt })}
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
  const t = useTranslations("promoterView");
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
              <th className="px-4 py-3 font-medium">{t("columnSchoolShort")}</th>
              <th className="px-4 py-3 font-medium">{t("columnDelivered")}</th>
              <th className="px-4 py-3 font-medium">{t("columnSold")}</th>
              <th className="px-4 py-3 font-medium">{t("columnOnHand")}</th>
              <th className="px-4 py-3 font-medium">{t("columnRevenue")}</th>
              <th className="px-4 py-3 font-medium">{t("columnDiscrepancies")}</th>
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
                      {money(s.revenue, s.currency, locale)}
                    </td>
                    <td className="px-4 py-3">
                      {s.varianceCount > 0 ? (
                        <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                          {s.varianceCount}
                        </span>
                      ) : (
                        <span className="rounded-full bg-success/12 px-2.5 py-1 text-xs font-medium text-success">
                          {t("none")}
                        </span>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={6} className="bg-muted/20 px-4 py-3">
                        {rows.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            {t("noStockYet", { name: s.name })}
                          </p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-muted-foreground">
                                <th className="py-1.5 pr-4 font-medium">{t("columnItem")}</th>
                                <th className="py-1.5 pr-4 font-medium">{t("columnCategory")}</th>
                                <th className="py-1.5 pr-4 font-medium">{t("columnDelivered")}</th>
                                <th className="py-1.5 pr-4 font-medium">{t("columnSold")}</th>
                                <th className="py-1.5 pr-4 font-medium">{t("columnOnHand")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((r) => (
                                <tr key={`${r.category}::${r.itemLabel}`} className="border-t border-border/60">
                                  <td className="py-1.5 pr-4 text-foreground">{r.itemLabel}</td>
                                  <td className="py-1.5 pr-4 text-muted-foreground">
                                    {categoryLabel(r.category)}
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
