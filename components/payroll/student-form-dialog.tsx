"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { usePayroll } from "@/lib/store";
import type { Cycle, Student, StudentStatus } from "@/lib/types";
import { CYCLES, CYCLE_CLASSES } from "@/lib/academic";
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

interface FormState {
  name: string;
  cycle: Cycle;
  className: string;
  guardianContact: string;
  monthlyFee: string;
  joinDate: string;
  status: StudentStatus;
}

const EMPTY: FormState = {
  name: "",
  cycle: "primaire",
  className: "",
  guardianContact: "",
  monthlyFee: "",
  joinDate: "",
  status: "active",
};

export function StudentFormDialog({
  trigger,
  student,
}: {
  trigger: ReactElement;
  student?: Student;
}) {
  const t = useTranslations("studentForm");
  const { activeClient, addStudent, updateStudent } = usePayroll();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const isEdit = Boolean(student);

  useEffect(() => {
    if (!open) return;
    if (student) {
      setForm({
        name: student.name,
        cycle: student.cycle,
        className: student.className,
        guardianContact: student.guardianContact,
        monthlyFee: String(student.monthlyFee),
        joinDate: student.joinDate,
        status: student.status,
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, student]);

  const valid = form.name.trim() && form.className.trim() && Number(form.monthlyFee) > 0;

  function handleSubmit() {
    if (!valid) return;
    if (isEdit && student) {
      updateStudent(student.id, {
        name: form.name.trim(),
        cycle: form.cycle,
        className: form.className.trim(),
        guardianContact: form.guardianContact.trim(),
        monthlyFee: Number(form.monthlyFee),
        joinDate: form.joinDate,
        status: form.status,
      });
      toast.add({ title: t("updatedToast", { name: form.name.trim() }), type: "success" });
    } else {
      addStudent({
        name: form.name.trim(),
        cycle: form.cycle,
        className: form.className.trim(),
        guardianContact: form.guardianContact.trim(),
        monthlyFee: Number(form.monthlyFee),
        joinDate: form.joinDate || new Date().toISOString().slice(0, 10),
        status: form.status,
        note: "",
      });
      toast.add({ title: t("addedToast", { name: form.name.trim() }), type: "success" });
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="sf-name">{t("fullName")}</Label>
            <Input
              id="sf-name"
              placeholder={t("fullNamePlaceholder")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-cycle">{t("cycle")}</Label>
            <NativeSelect
              id="sf-cycle"
              className="w-full"
              value={form.cycle}
              onChange={(e) => {
                const cycle = e.target.value as Cycle;
                // Reset the class whenever the cycle changes so we never
                // save a class that belongs to a different cycle.
                setForm((f) => ({ ...f, cycle, className: "" }));
              }}
            >
              {CYCLES.map((c) => (
                <NativeSelectOption key={c.value} value={c.value}>
                  {c.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-class">{t("class")}</Label>
            <NativeSelect
              id="sf-class"
              className="w-full"
              value={form.className}
              onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))}
            >
              <NativeSelectOption value="" disabled>
                {t("selectClass")}
              </NativeSelectOption>
              {CYCLE_CLASSES[form.cycle].map((cls) => (
                <NativeSelectOption key={cls} value={cls}>
                  {cls}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-fee">
              {t("monthlyFee", { currency: activeClient.currency })}
            </Label>
            <Input
              id="sf-fee"
              type="number"
              min={0}
              placeholder={t("monthlyFeePlaceholder")}
              value={form.monthlyFee}
              onChange={(e) => setForm((f) => ({ ...f, monthlyFee: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-contact">{t("guardianContact")}</Label>
            <Input
              id="sf-contact"
              placeholder="+233 24 000 0000"
              value={form.guardianContact}
              onChange={(e) => setForm((f) => ({ ...f, guardianContact: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-join">{t("joinDate")}</Label>
            <Input
              id="sf-join"
              type="date"
              value={form.joinDate}
              onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="sf-status">{t("status")}</Label>
            <NativeSelect
              id="sf-status"
              className="w-full"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as StudentStatus }))
              }
            >
              <NativeSelectOption value="active">{t("statusActive")}</NativeSelectOption>
              <NativeSelectOption value="withdrawn">{t("statusWithdrawn")}</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!valid}>
            {isEdit ? t("saveChanges") : t("addStudent")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
