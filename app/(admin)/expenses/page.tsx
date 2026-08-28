"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Search, Plus, Pencil, Trash2, Fuel, Wrench, Building2, Package, Zap, CreditCard, Receipt } from "lucide-react";
import { usePayroll } from "@/lib/store";
import { money, formatDate } from "@/lib/format";
import type { ExpenseCategory } from "@/lib/types";
import { PageHeader } from "@/components/payroll/page-header";
import { StatCard } from "@/components/payroll/stat-card";
import { ExpenseFormDialog } from "@/components/payroll/expense-form-dialog";
import { ConfirmDeleteDialog } from "@/components/payroll/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CATEGORY_ICON: Record<ExpenseCategory, typeof Fuel> = {
  fuel: Fuel,
  credit: CreditCard,
  renovation: Building2,
  supplies: Package,
  utilities: Zap,
  maintenance: Wrench,
  other: Receipt,
};

const CATEGORY_LABEL_KEY: Record<ExpenseCategory, "categoryFuel" | "categoryCredit" | "categoryRenovation" | "categorySupplies" | "categoryUtilities" | "categoryMaintenance" | "categoryOther"> = {
  fuel: "categoryFuel",
  credit: "categoryCredit",
  renovation: "categoryRenovation",
  supplies: "categorySupplies",
  utilities: "categoryUtilities",
  maintenance: "categoryMaintenance",
  other: "categoryOther",
};

export default function ExpensesPage() {
  const t = useTranslations("expensesPage");
  const locale = useLocale() as "en" | "fr";
  const { activeClient, clientExpenses, period, removeExpense } = usePayroll();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const sorted = useMemo(
    () => [...clientExpenses].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [clientExpenses],
  );

  const totalThisPeriod = clientExpenses
    .filter((e) => e.date.slice(0, 7) === period)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalAllTime = clientExpenses.reduce((sum, e) => sum + e.amount, 0);

  const filtered = sorted.filter((e) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || e.description.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
    return matchesQuery && matchesCategory;
  });

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description", { schoolName: activeClient.name })}
        action={
          <ExpenseFormDialog
            trigger={
              <Button>
                <Plus className="size-4" />
                {t("logExpense")}
              </Button>
            }
          />
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("entries")} value={clientExpenses.length} />
        <StatCard
          label={t("thisPeriod")}
          value={money(totalThisPeriod, activeClient.currency, locale)}
          className="border-brand-clay/30 bg-brand-clay/5"
        />
        <StatCard label={t("allTime")} value={money(totalAllTime, activeClient.currency, locale)} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-9 pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value ?? "all")}>
          <SelectTrigger className="h-9 w-full sm:w-52">
            <SelectValue placeholder={t("allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {Object.entries(CATEGORY_LABEL_KEY).map(([value, labelKey]) => (
              <SelectItem key={value} value={value}>
                {t(labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("columnDescription")}</TableHead>
                <TableHead>{t("columnCategory")}</TableHead>
                <TableHead>{t("columnDate")}</TableHead>
                <TableHead>{t("columnLoggedBy")}</TableHead>
                <TableHead>{t("columnAmount")}</TableHead>
                <TableHead className="text-right">{t("columnActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    {t("noExpenses")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => {
                  const Icon = CATEGORY_ICON[e.category];
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium text-foreground">
                        {e.description}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                          <Icon className="size-3.5" />
                          {t(CATEGORY_LABEL_KEY[e.category])}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(e.date, locale)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.submittedBy}
                      </TableCell>
                      <TableCell className="font-medium text-destructive">
                        −{money(e.amount, activeClient.currency, locale)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <ExpenseFormDialog
                            expense={e}
                            trigger={
                              <Button variant="ghost" size="icon-sm">
                                <Pencil className="size-3.5" />
                              </Button>
                            }
                          />
                          <ConfirmDeleteDialog
                            title={t("removeConfirmTitle")}
                            description={t("removeConfirmDescription")}
                            onConfirm={() => removeExpense(e.id)}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
