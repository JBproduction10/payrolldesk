import { Eye, ReceiptText } from "lucide-react";
import { money, periodLabel } from "@/lib/format";
import type { Client, Employee, Payslip } from "@/lib/types";
import { PayslipStatusBadge } from "@/components/payroll/status-badges";
import { PortalPayslipDialog } from "@/components/payroll/portal-payslip-dialog";
import { Button } from "@/components/ui/button";

export function TeacherView({
  client,
  employee,
  payslips,
}: {
  client: Client;
  employee: Employee;
  payslips: Payslip[];
}) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          My Payslips
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {employee.name} · {employee.position} · {client.name}
        </p>
      </div>

      {payslips.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <ReceiptText className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No payslips have been generated for you yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Gross</th>
                  <th className="px-4 py-3 font-medium">Deductions</th>
                  <th className="px-4 py-3 font-medium">Net Pay</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payslips.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {periodLabel(p.period)}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {money(p.gross, client.currency)}
                    </td>
                    <td className="px-4 py-3 text-destructive">
                      −{money(p.totalDeductions, client.currency)}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {money(p.net, client.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <PayslipStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PortalPayslipDialog
                        payslip={p}
                        employeeName={employee.name}
                        employeePosition={employee.position}
                        currency={client.currency}
                        schoolName={client.name}
                        trigger={
                          <Button variant="outline" size="sm">
                            <Eye className="size-3.5" />
                            View
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
