"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { usePayroll } from "@/lib/store";
import type { Expense, ExpenseCategory } from "@/lib/types";
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

const CATEGORY_KEYS: { value: ExpenseCategory; labelKey: string }[] = [
  { value: "fuel", labelKey: "categoryFuel" },
  { value: "credit", labelKey: "categoryCredit" },
  { value: "renovation", labelKey: "categoryRenovation" },
  { value: "supplies", labelKey: "categorySupplies" },
  { value: "utilities", labelKey: "categoryUtilities" },
  { value: "maintenance", labelKey: "categoryMaintenance" },
  { value: "other", labelKey: "categoryOther" },
];

interface FormState {
  category: ExpenseCategory;
  description: string;
  amount: string;
  date: string;
}

function empty(): FormState {
  return {
    category: "other",
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
  };
}

export function ExpenseFormDialog({
  trigger,
  expense,
}: {
  trigger: ReactElement;
  expense?: Expense;
}) {
  const t = useTranslations("expenseForm");
  const tCat = useTranslations("expensesPage");
  const { activeClient, addExpense, updateExpense } = usePayroll();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty());
  const isEdit = Boolean(expense);

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setForm({
        category: expense.category,
        description: expense.description,
        amount: String(expense.amount),
        date: expense.date,
      });
    } else {
      setForm(empty());
    }
  }, [open, expense]);

  const valid = form.description.trim() && Number(form.amount) > 0 && form.date;

  function handleSubmit() {
    if (!valid) return;
    if (isEdit && expense) {
      updateExpense(expense.id, {
        category: form.category,
        description: form.description.trim(),
        amount: Number(form.amount),
        date: form.date,
      });
      toast.add({ title: t("updatedToast"), type: "success" });
    } else {
      addExpense({
        category: form.category,
        description: form.description.trim(),
        amount: Number(form.amount),
        date: form.date,
        submittedBy: session?.user?.name ?? t("defaultSubmitter"),
      });
      toast.add({ title: t("loggedToast"), type: "success" });
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
              : t("addDescription", { schoolName: activeClient.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="xf-desc">{t("description")}</Label>
            <Input
              id="xf-desc"
              placeholder={t("descriptionPlaceholder")}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="xf-category">{t("category")}</Label>
              <NativeSelect
                id="xf-category"
                className="w-full"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))
                }
              >
                {CATEGORY_KEYS.map((c) => (
                  <NativeSelectOption key={c.value} value={c.value}>
                    {tCat(c.labelKey)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="xf-amount">{t("amount", { currency: activeClient.currency })}</Label>
              <Input
                id="xf-amount"
                type="number"
                min={0}
                placeholder={t("amountPlaceholder")}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="xf-date">{t("date")}</Label>
            <Input
              id="xf-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!valid}>
            {isEdit ? t("saveChanges") : t("logExpense")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
