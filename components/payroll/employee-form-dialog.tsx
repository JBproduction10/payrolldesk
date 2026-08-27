"use client";

import { useEffect, useState, type ReactElement } from "react";
import { usePayroll } from "@/lib/store";
import type { Employee, EmployeeStatus } from "@/lib/types";
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
  email: string;
  phone: string;
  departmentId: string;
  position: string;
  baseSalary: string;
  joinDate: string;
  status: EmployeeStatus;
}

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  departmentId: "",
  position: "",
  baseSalary: "",
  joinDate: "",
  status: "active",
};

export function EmployeeFormDialog({
  trigger,
  employee,
}: {
  trigger: ReactElement;
  employee?: Employee;
}) {
  const { activeClient, clientDepartments, addEmployee, updateEmployee } = usePayroll();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const isEdit = Boolean(employee);

  useEffect(() => {
    if (!open) return;
    if (employee) {
      setForm({
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        departmentId: employee.departmentId,
        position: employee.position,
        baseSalary: String(employee.baseSalary),
        joinDate: employee.joinDate,
        status: employee.status,
      });
    } else {
      setForm({ ...EMPTY, departmentId: clientDepartments[0]?.id ?? "" });
    }
  }, [open, employee, clientDepartments]);

  const valid = Boolean(
    form.name.trim() &&
      form.email.trim() &&
      form.departmentId &&
      form.position.trim() &&
      Number(form.baseSalary) > 0,
  );

  function handleSubmit() {
    if (!valid) return;
    const channels: Employee["channels"] = form.phone.trim()
      ? ["email", "whatsapp"]
      : ["email"];

    if (isEdit && employee) {
      updateEmployee(employee.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        departmentId: form.departmentId,
        position: form.position.trim(),
        baseSalary: Number(form.baseSalary),
        joinDate: form.joinDate,
        status: form.status,
        channels,
      });
      toast.add({ title: `Updated ${form.name.trim()}`, type: "success" });
    } else {
      addEmployee({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        departmentId: form.departmentId,
        position: form.position.trim(),
        baseSalary: Number(form.baseSalary),
        joinDate: form.joinDate || new Date().toISOString().slice(0, 10),
        status: form.status,
        channels,
        code: `${activeClient.name.slice(0, 2).toUpperCase()}-${Math.floor(
          1000 + Math.random() * 9000,
        )}`,
        values: {},
      });
      toast.add({ title: `Added ${form.name.trim()}`, type: "success" });
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Employee" : "Add Employee"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this employee's details."
              : `Add a new employee to ${activeClient.name}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="ef-name">Full name *</Label>
            <Input
              id="ef-name"
              placeholder="e.g. Jane Doe"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ef-email">Email *</Label>
            <Input
              id="ef-email"
              type="email"
              placeholder={`name@${activeClient.domain}`}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ef-phone">Phone / WhatsApp</Label>
            <Input
              id="ef-phone"
              placeholder="+1 555 000 0000"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ef-dept">Department *</Label>
            <NativeSelect
              id="ef-dept"
              className="w-full"
              value={form.departmentId}
              onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
            >
              <NativeSelectOption value="" disabled>
                Select department
              </NativeSelectOption>
              {clientDepartments.map((d) => (
                <NativeSelectOption key={d.id} value={d.id}>
                  {d.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ef-position">Position *</Label>
            <Input
              id="ef-position"
              placeholder="e.g. Engineer"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ef-salary">Base salary ({activeClient.currency}) *</Label>
            <Input
              id="ef-salary"
              type="number"
              min={0}
              placeholder="6000"
              value={form.baseSalary}
              onChange={(e) => setForm((f) => ({ ...f, baseSalary: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ef-join">Join date</Label>
            <Input
              id="ef-join"
              type="date"
              value={form.joinDate}
              onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ef-status">Status</Label>
            <NativeSelect
              id="ef-status"
              className="w-full"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as EmployeeStatus }))
              }
            >
              <NativeSelectOption value="active">Active</NativeSelectOption>
              <NativeSelectOption value="leave">On Leave</NativeSelectOption>
              <NativeSelectOption value="inactive">Inactive</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid}>
            {isEdit ? "Save Changes" : "Add Employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
