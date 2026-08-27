"use client";

import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { usePayroll } from "@/lib/store";
import { money } from "@/lib/format";
import { colorForIndex } from "@/lib/colors";
import { computePayslip } from "@/lib/payroll";
import { PageHeader } from "@/components/payroll/page-header";
import { StatCard } from "@/components/payroll/stat-card";
import { InitialsAvatar } from "@/components/payroll/initials-avatar";
import { DepartmentFormDialog } from "@/components/payroll/department-form-dialog";
import { ConfirmDeleteDialog } from "@/components/payroll/confirm-delete-dialog";
import { Button } from "@/components/ui/button";

export default function DepartmentsPage() {
  const {
    activeClient,
    clientDepartments,
    clientEmployees,
    clientFields,
    removeDepartment,
  } = usePayroll();

  const totalPayroll = clientEmployees
    .filter((e) => e.status !== "inactive")
    .reduce((sum, e) => sum + computePayslip(e, clientFields).gross, 0);

  return (
    <>
      <PageHeader
        title="Departments"
        description={`${clientDepartments.length} departments · ${clientEmployees.length} employees`}
        action={
          <DepartmentFormDialog
            trigger={
              <Button>
                <Plus className="size-4" />
                Add Department
              </Button>
            }
          />
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total headcount"
          value={clientEmployees.length}
          icon={<Users className="size-4.5" />}
          iconClassName="bg-brand-pine-mid/15 text-brand-pine-mid"
        />
        <StatCard
          label="Monthly payroll"
          value={money(totalPayroll, activeClient.currency)}
          icon={<span className="text-sm font-semibold">{activeClient.currency}</span>}
          iconClassName="bg-brand-gold/20 text-[oklch(0.42_0.09_70)]"
        />
        <StatCard
          label="Departments"
          value={clientDepartments.length}
          icon={<span className="text-sm font-semibold">#</span>}
          iconClassName="bg-brand-olive/15 text-brand-olive"
        />
      </div>

      {clientDepartments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
          No departments yet — add one to start grouping employees.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clientDepartments.map((d) => {
            const staff = clientEmployees.filter((e) => e.departmentId === d.id);
            const payroll = staff
              .filter((e) => e.status !== "inactive")
              .reduce((sum, e) => sum + computePayslip(e, clientFields).gross, 0);
            const head = clientEmployees.find((e) => e.id === d.headId);
            const visible = staff.slice(0, 5);
            const extra = staff.length - visible.length;

            return (
              <div
                key={d.id}
                className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Users className="size-4.5" />
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {staff.length} people
                  </span>
                </div>

                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {d.name}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{d.description}</p>

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/60 p-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Head</div>
                    <div className="truncate text-sm font-medium text-foreground">
                      {head?.name ?? "Unassigned"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Monthly payroll</div>
                    <div className="text-sm font-medium text-foreground">
                      {money(payroll, activeClient.currency)}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    Members
                  </div>
                  <div className="flex items-center">
                    {visible.map((e, i) => (
                      <InitialsAvatar
                        key={e.id}
                        name={e.name}
                        color={colorForIndex(i)}
                        size="sm"
                        className="-ml-2 border-2 border-card first:ml-0"
                      />
                    ))}
                    {extra > 0 && (
                      <span className="-ml-2 flex size-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[11px] font-medium text-muted-foreground">
                        +{extra}
                      </span>
                    )}
                    {staff.length === 0 && (
                      <span className="text-xs text-muted-foreground">No members yet</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  <DepartmentFormDialog
                    department={d}
                    trigger={
                      <Button variant="outline" size="sm" className="flex-1">
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                    }
                  />
                  <ConfirmDeleteDialog
                    title={`Delete ${d.name}?`}
                    description={`This removes the department and its ${staff.length} employee${staff.length === 1 ? "" : "s"}. This can't be undone.`}
                    onConfirm={() => removeDepartment(d.id)}
                    trigger={
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
