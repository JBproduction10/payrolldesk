"use client";

import { RotateCcw } from "lucide-react";
import { usePayroll } from "@/lib/store";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/payroll/confirm-delete-dialog";

function Row({
  label,
  sub,
  deletedAt,
  onRestore,
  onPurge,
  purgeWarning,
}: {
  label: string;
  sub: string;
  deletedAt: string;
  onRestore: () => void;
  onPurge: () => void;
  purgeWarning: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        <p className="truncate text-xs text-muted-foreground">
          {sub} · removed {timeAgo(deletedAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRestore}>
          <RotateCcw className="size-3.5" />
          Restore
        </Button>
        <ConfirmDeleteDialog
          title="Delete forever?"
          description={purgeWarning}
          confirmLabel="Delete forever"
          onConfirm={onPurge}
          trigger={
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
              Delete forever
            </Button>
          }
        />
      </div>
    </li>
  );
}

export function TrashPanel() {
  const {
    deletedClients,
    clientDeletedEmployees,
    clientDeletedStudents,
    activeClient,
    restoreClient,
    purgeClient,
    restoreEmployee,
    purgeEmployee,
    restoreStudent,
    purgeStudent,
  } = usePayroll();

  const empty =
    deletedClients.length === 0 &&
    clientDeletedEmployees.length === 0 &&
    clientDeletedStudents.length === 0;

  if (empty) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        Nothing in the trash. Deleted employees, students, and clients show up
        here so you can undo a mistake.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {clientDeletedEmployees.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <h3 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
            Employees — {activeClient.name}
          </h3>
          <ul className="divide-y divide-border">
            {clientDeletedEmployees.map((e) => (
              <Row
                key={e.id}
                label={e.name}
                sub={e.position}
                deletedAt={e.deletedAt!}
                onRestore={() => restoreEmployee(e.id)}
                onPurge={() => purgeEmployee(e.id)}
                purgeWarning={`This permanently deletes ${e.name}'s employee record. This can't be undone.`}
              />
            ))}
          </ul>
        </section>
      )}

      {clientDeletedStudents.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <h3 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
            Students — {activeClient.name}
          </h3>
          <ul className="divide-y divide-border">
            {clientDeletedStudents.map((s) => (
              <Row
                key={s.id}
                label={s.name}
                sub={s.className}
                deletedAt={s.deletedAt!}
                onRestore={() => restoreStudent(s.id)}
                onPurge={() => purgeStudent(s.id)}
                purgeWarning={`This permanently deletes ${s.name}'s enrollment and payment history. This can't be undone.`}
              />
            ))}
          </ul>
        </section>
      )}

      {deletedClients.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <h3 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
            Clients
          </h3>
          <ul className="divide-y divide-border">
            {deletedClients.map((c) => (
              <Row
                key={c.id}
                label={c.name}
                sub={c.domain}
                deletedAt={c.deletedAt!}
                onRestore={() => restoreClient(c.id)}
                onPurge={() => purgeClient(c.id)}
                purgeWarning={`This permanently deletes ${c.name} and every employee, student, and payslip under it. This can't be undone.`}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
