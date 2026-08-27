"use client";

import { useMemo, useState } from "react";
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

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  fuel: "Fuel",
  credit: "Credit repayment",
  renovation: "Renovation",
  supplies: "Supplies",
  utilities: "Utilities",
  maintenance: "Maintenance",
  other: "Other",
};

export default function ExpensesPage() {
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
        title="Expenses"
        description={`Operating costs for ${activeClient.name}`}
        action={
          <ExpenseFormDialog
            trigger={
              <Button>
                <Plus className="size-4" />
                Log Expense
              </Button>
            }
          />
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Entries" value={clientExpenses.length} />
        <StatCard
          label="This period"
          value={money(totalThisPeriod, activeClient.currency)}
          className="border-brand-clay/30 bg-brand-clay/5"
        />
        <StatCard label="All time" value={money(totalAllTime, activeClient.currency)} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search expenses…"
            className="h-9 pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value ?? "all")}>
          <SelectTrigger className="h-9 w-full sm:w-52">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
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
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Logged by</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    No expenses logged yet.
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
                          {CATEGORY_LABEL[e.category]}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(e.date)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.submittedBy}
                      </TableCell>
                      <TableCell className="font-medium text-destructive">
                        −{money(e.amount, activeClient.currency)}
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
                            title="Remove this expense?"
                            description="This entry will no longer count toward your totals."
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
