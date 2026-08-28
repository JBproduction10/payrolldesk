"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Plus, Minus, Info, Trash2 } from "lucide-react";
import { usePayroll } from "@/lib/store";
import type { FieldCategory, PayField } from "@/lib/types";
import { PageHeader } from "@/components/payroll/page-header";
import { FieldFormDialog } from "@/components/payroll/field-form-dialog";
import { ConfirmDeleteDialog } from "@/components/payroll/confirm-delete-dialog";
import { Button } from "@/components/ui/button";

function useTypeBadge() {
  const t = useTranslations("fieldDesignerPage");
  return (field: PayField): string => {
    switch (field.type) {
      case "fixed":
        return t("typeNumber");
      case "percent":
        return t("typePercentage");
      case "perEmployee":
        return t("typePerEmployee");
      case "text":
        return t("typeText");
    }
  };
}

function valueBadge(field: PayField): string {
  if (field.type === "fixed") return `$${field.amount.toLocaleString()}`;
  if (field.type === "percent") return `${field.amount}%`;
  if (field.type === "text") return field.textValue || "—";
  return "—";
}

function FieldColumn({
  title,
  description,
  icon,
  iconClassName,
  category,
  fields,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  iconClassName: string;
  category: FieldCategory;
  fields: PayField[];
}) {
  const t = useTranslations("fieldDesignerPage");
  const typeBadge = useTypeBadge();
  const { removeField } = usePayroll();
  const visible = fields.filter((f) => !f.system);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex size-9 items-center justify-center rounded-lg ${iconClassName}`}>
          {icon}
        </span>
        <div className="flex-1">
          <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {visible.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col divide-y divide-border">
        {visible.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("noFieldsYet")}
          </p>
        )}
        {visible.map((f) => (
          <div key={f.id} className="group flex items-center justify-between gap-2 py-3">
            <FieldFormDialog
              field={f}
              trigger={
                <button className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-medium text-foreground">
                    {f.label}
                    {f.required && (
                      <span className="ml-2 rounded-full bg-brand-gold/20 px-1.5 py-0.5 text-[10px] font-medium text-[oklch(0.42_0.09_70)]">
                        {t("required")}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {typeBadge(f)}
                    </span>
                    <span className="text-xs text-muted-foreground">{valueBadge(f)}</span>
                  </div>
                </button>
              }
            />
            <ConfirmDeleteDialog
              title={t("removeConfirmTitle", { label: f.label })}
              description={t("removeConfirmDescription")}
              onConfirm={() => removeField(f.id)}
              trigger={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              }
            />
          </div>
        ))}
      </div>

      <FieldFormDialog
        defaultCategory={category}
        trigger={
          <button className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <Plus className="size-3.5" />
            {category === "earning" ? t("addEarning") : category === "deduction" ? t("addDeduction") : t("addInformation")}
          </button>
        }
      />
    </div>
  );
}

export default function FieldDesignerPage() {
  const t = useTranslations("fieldDesignerPage");
  const { clientFields } = usePayroll();

  const earnings = clientFields.filter((f) => f.category === "earning");
  const deductions = clientFields.filter((f) => f.category === "deduction");
  const info = clientFields.filter((f) => f.category === "info");

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <FieldFormDialog
            trigger={
              <Button>
                <Plus className="size-4" />
                {t("addField")}
              </Button>
            }
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FieldColumn
          title={t("earningsTitle")}
          description={t("earningsDescription")}
          icon={<Plus className="size-4.5" />}
          iconClassName="bg-success/12 text-success"
          category="earning"
          fields={earnings}
        />
        <FieldColumn
          title={t("deductionsTitle")}
          description={t("deductionsDescription")}
          icon={<Minus className="size-4.5" />}
          iconClassName="bg-brand-gold/20 text-[oklch(0.42_0.09_70)]"
          category="deduction"
          fields={deductions}
        />
        <FieldColumn
          title={t("infoTitle")}
          description={t("infoDescription")}
          icon={<Info className="size-4.5" />}
          iconClassName="bg-secondary text-secondary-foreground"
          category="info"
          fields={info}
        />
      </div>
    </>
  );
}
