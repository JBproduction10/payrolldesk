"use client";

import { Plus, Pencil, Trash2, Eye, Landmark, Users, Building2 } from "lucide-react";
import { usePayroll } from "@/lib/store";
import { swatch } from "@/lib/colors";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/payroll/page-header";
import { StatCard } from "@/components/payroll/stat-card";
import { ClientFormDialog } from "@/components/payroll/client-form-dialog";
import { ConfirmDeleteDialog } from "@/components/payroll/confirm-delete-dialog";
import { TrashDialog } from "@/components/payroll/trash-dialog";
import { Button } from "@/components/ui/button";

export default function ClientsPage() {
  const {
    clients,
    departments,
    employees,
    payslips,
    period,
    activeClientId,
    deletedClients,
    setActiveClient,
    removeClient,
    restoreClient,
  } = usePayroll();

  function handleDelete(id: string, name: string) {
    if (clients.length === 1) {
      toast.add({ title: "Can't delete your only client", type: "error" });
      return;
    }
    removeClient(id);
    toast.add({
      title: `Removed ${name}`,
      type: "success",
      actionProps: {
        children: "Undo",
        onClick: () => restoreClient(id),
      },
    });
  }

  return (
    <>
      <PageHeader
        title="Clients"
        description="Manage the organisations you run payroll for"
        action={
          <div className="flex items-center gap-2">
            <TrashDialog
              trigger={
                <Button variant="outline">
                  <Trash2 className="size-4" />
                  Trash
                  {deletedClients.length > 0 ? ` (${deletedClients.length})` : ""}
                </Button>
              }
              title="Deleted clients"
              emptyLabel="No deleted clients."
              rows={deletedClients.map((c) => ({
                id: c.id,
                name: c.name,
                deletedAt: c.deletedAt,
              }))}
              onRestore={restoreClient}
            />
            <ClientFormDialog
              trigger={
                <Button>
                  <Plus className="size-4" />
                  Add Client
                </Button>
              }
            />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total clients"
          value={clients.length}
          icon={<Landmark className="size-4.5" />}
          iconClassName="bg-brand-pine-mid/15 text-brand-pine-mid"
        />
        <StatCard
          label="Total employees"
          value={employees.length}
          icon={<Users className="size-4.5" />}
          iconClassName="bg-brand-gold/20 text-[oklch(0.42_0.09_70)]"
        />
        <StatCard
          label="Departments"
          value={departments.length}
          icon={<Building2 className="size-4.5" />}
          iconClassName="bg-brand-olive/15 text-brand-olive"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clients.map((c) => {
          const isActive = c.id === activeClientId;
          const empCount = employees.filter((e) => e.clientId === c.id).length;
          const deptCount = departments.filter((d) => d.clientId === c.id).length;
          const payslipCount = payslips.filter(
            (p) => p.clientId === c.id && p.period === period,
          ).length;

          return (
            <div
              key={c.id}
              className={`flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-colors ${
                isActive ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${swatch(c.color).solid}`}
                >
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-heading text-lg font-semibold text-foreground">
                      {c.name}
                    </h3>
                    {isActive && (
                      <span className="shrink-0 rounded-full bg-success/12 px-2 py-0.5 text-xs font-medium text-success">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {c.description}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  @{c.domain}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-3 text-center">
                <div>
                  <div className="font-heading text-lg font-semibold text-foreground">
                    {empCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Employees</div>
                </div>
                <div>
                  <div className="font-heading text-lg font-semibold text-foreground">
                    {deptCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Departments</div>
                </div>
                <div>
                  <div className="font-heading text-lg font-semibold text-foreground">
                    {payslipCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Payslips</div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                {isActive ? (
                  <span className="flex flex-1 items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                    Working here now
                  </span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setActiveClient(c.id);
                      toast.add({ title: `Switched to ${c.name}` });
                    }}
                  >
                    <Eye className="size-3.5" />
                    Set active
                  </Button>
                )}
                <ClientFormDialog
                  client={c}
                  trigger={
                    <Button variant="ghost" size="icon-sm">
                      <Pencil className="size-3.5" />
                    </Button>
                  }
                />
                <ConfirmDeleteDialog
                  title={`Remove ${c.name}?`}
                  description={`This moves ${c.name} to Trash. Its employees, departments, and payslip history are kept and everything comes back if you restore it.`}
                  onConfirm={() => handleDelete(c.id, c.name)}
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
            </div>
          );
        })}
      </div>
    </>
  );
}
