"use client";

import { useEffect, useState, type ReactElement } from "react";
import { usePayroll } from "@/lib/store";
import type { Department } from "@/lib/types";
import type { BrandColorKey } from "@/lib/colors";
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
import { ColorSwatchPicker } from "./color-swatch-picker";

interface FormState {
  name: string;
  description: string;
  headId: string;
  color: BrandColorKey;
}

const EMPTY: FormState = { name: "", description: "", headId: "", color: "pine" };

export function DepartmentFormDialog({
  trigger,
  department,
}: {
  trigger: ReactElement;
  department?: Department;
}) {
  const { activeClient, clientEmployees, addDepartment, updateDepartment } =
    usePayroll();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const isEdit = Boolean(department);

  useEffect(() => {
    if (!open) return;
    if (department) {
      setForm({
        name: department.name,
        description: department.description,
        headId: department.headId ?? "",
        color: (department.color as BrandColorKey) ?? "pine",
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, department]);

  const membersOfDept = department
    ? clientEmployees.filter((e) => e.departmentId === department.id)
    : clientEmployees;

  const valid = form.name.trim().length > 0;

  function handleSubmit() {
    if (!valid) return;
    if (isEdit && department) {
      updateDepartment(department.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        headId: form.headId || null,
        color: form.color,
      });
      toast.add({ title: `Updated ${form.name.trim()}`, type: "success" });
    } else {
      addDepartment({
        name: form.name.trim(),
        description: form.description.trim(),
        headId: form.headId || null,
        color: form.color,
      });
      toast.add({ title: `Created ${form.name.trim()}`, type: "success" });
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Department" : "Add Department"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this department's details."
              : `Create a new department for ${activeClient.name}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="df-name">Department name *</Label>
            <Input
              id="df-name"
              placeholder="e.g. Engineering"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="df-desc">Description</Label>
            <Input
              id="df-desc"
              placeholder="What this team does"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="df-head">Department head</Label>
            <NativeSelect
              id="df-head"
              className="w-full"
              value={form.headId}
              onChange={(e) => setForm((f) => ({ ...f, headId: e.target.value }))}
            >
              <NativeSelectOption value="">No head assigned</NativeSelectOption>
              {membersOfDept.map((e) => (
                <NativeSelectOption key={e.id} value={e.id}>
                  {e.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Colour</Label>
            <ColorSwatchPicker
              value={form.color}
              onChange={(c) => setForm((f) => ({ ...f, color: c }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid}>
            {isEdit ? "Save Changes" : "Add Department"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
