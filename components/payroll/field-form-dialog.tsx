"use client";

import { useEffect, useState, type ReactElement } from "react";
import { usePayroll } from "@/lib/store";
import type { FieldCategory, FieldType, PayField } from "@/lib/types";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn } from "@/lib/utils";

interface FormState {
  label: string;
  category: FieldCategory;
  type: FieldType;
  amount: string;
  textValue: string;
  required: boolean;
  departmentIds: string[];
}

const EMPTY: FormState = {
  label: "",
  category: "earning",
  type: "fixed",
  amount: "",
  textValue: "",
  required: false,
  departmentIds: [],
};

const CATEGORY_OPTIONS: { value: FieldCategory; label: string }[] = [
  { value: "earning", label: "Earning (+)" },
  { value: "deduction", label: "Deduction (−)" },
  { value: "info", label: "Info" },
];

export function FieldFormDialog({
  trigger,
  field,
  defaultCategory,
}: {
  trigger: ReactElement;
  field?: PayField;
  defaultCategory?: FieldCategory;
}) {
  const { clientDepartments, addField, updateField } = usePayroll();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const isEdit = Boolean(field);

  useEffect(() => {
    if (!open) return;
    if (field) {
      setForm({
        label: field.label,
        category: field.category,
        type: field.type,
        amount: field.amount ? String(field.amount) : "",
        textValue: field.textValue,
        required: field.required,
        departmentIds: field.departmentIds,
      });
    } else {
      setForm({
        ...EMPTY,
        category: defaultCategory ?? "earning",
        type: defaultCategory === "info" ? "text" : "fixed",
      });
    }
  }, [open, field, defaultCategory]);

  const valid = form.label.trim().length > 0;

  function handleSubmit() {
    if (!valid) return;
    const payload = {
      label: form.label.trim(),
      category: form.category,
      type: form.category === "info" ? "text" : form.type,
      amount: form.type === "fixed" || form.type === "percent" ? Number(form.amount) || 0 : 0,
      textValue: form.textValue,
      required: form.required,
      departmentIds: form.departmentIds,
      note: field?.note ?? "",
    } as Omit<PayField, "id" | "clientId" | "order">;

    if (isEdit && field) {
      updateField(field.id, payload);
      toast.add({ title: `Updated ${payload.label}`, type: "success" });
    } else {
      addField(payload);
      toast.add({ title: `Added ${payload.label}`, type: "success" });
    }
    setOpen(false);
  }

  function toggleDept(id: string) {
    setForm((f) => ({
      ...f,
      departmentIds: f.departmentIds.includes(id)
        ? f.departmentIds.filter((x) => x !== id)
        : [...f.departmentIds, id],
    }));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Field" : "Add Field"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update how this field is calculated."
              : "Define a new field that appears on every payslip."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ff-label">Field label *</Label>
            <Input
              id="ff-label"
              placeholder="e.g. Overtime Pay"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ff-category">Category</Label>
              <NativeSelect
                id="ff-category"
                className="w-full"
                value={form.category}
                onChange={(e) => {
                  const category = e.target.value as FieldCategory;
                  setForm((f) => ({
                    ...f,
                    category,
                    type: category === "info" ? "text" : f.type === "text" ? "fixed" : f.type,
                  }));
                }}
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <NativeSelectOption key={o.value} value={o.value}>
                    {o.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ff-type">Type</Label>
              {form.category === "info" ? (
                <NativeSelect id="ff-type" value="text" disabled className="w-full">
                  <NativeSelectOption value="text">Text</NativeSelectOption>
                </NativeSelect>
              ) : (
                <NativeSelect
                  id="ff-type"
                  className="w-full"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FieldType }))}
                >
                  <NativeSelectOption value="fixed">Fixed amount</NativeSelectOption>
                  <NativeSelectOption value="percent">Percentage (%)</NativeSelectOption>
                  <NativeSelectOption value="perEmployee">
                    Per employee (entered individually)
                  </NativeSelectOption>
                </NativeSelect>
              )}
            </div>
          </div>

          {form.category !== "info" && form.type === "fixed" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ff-amount">Amount (USD)</Label>
              <Input
                id="ff-amount"
                type="number"
                min={0}
                placeholder="e.g. 500"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
          )}

          {form.category !== "info" && form.type === "percent" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ff-percent">Percent (%)</Label>
              <Input
                id="ff-percent"
                type="number"
                min={0}
                max={100}
                placeholder="e.g. 5"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                {form.category === "earning" ? "% of base salary" : "% of gross pay"}
              </p>
            </div>
          )}

          {form.category !== "info" && form.type === "perEmployee" && (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              This amount is entered individually on each employee record instead of a
              shared value.
            </p>
          )}

          {form.category === "info" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ff-text">Default value</Label>
              <Input
                id="ff-text"
                placeholder="e.g. •••• 0000"
                value={form.textValue}
                onChange={(e) => setForm((f) => ({ ...f, textValue: e.target.value }))}
              />
            </div>
          )}

          {clientDepartments.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Applies to</Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, departmentIds: [] }))}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    form.departmentIds.length === 0
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  All departments
                </button>
                {clientDepartments.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDept(d.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      form.departmentIds.includes(d.id)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={form.required}
              onCheckedChange={(v) => setForm((f) => ({ ...f, required: v === true }))}
            />
            Required field
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid}>
            Save Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
