"use client";

import { Sparkles, CheckCheck, Eye } from "lucide-react";
import { usePayroll } from "@/lib/store";
import type { Employee, Payslip } from "@/lib/types";
import { money, periodLabel } from "@/lib/format";
import { colorForIndex } from "@/lib/colors";
import { PageHeader } from "@/components/payroll/page-header";
import { StatCard } from "@/components/payroll/stat-card";
import { InitialsAvatar } from "@/components/payroll/initials-avatar";
import { PayslipStatusBadge } from "@/components/payroll/status-badges";
import { GeneratePayslipsDialog } from "@/components/payroll/generate-payslips-dialog";
import { PayslipPreviewDialog } from "@/components/payroll/payslip-preview-dialog";
import { TablePagination } from "@/components/payroll/table-pagination";
import { usePagination } from "@/lib/use-pagination";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PayslipsPage() {
  const {
    activeClient,
    period,
    clientEmployees,
    clientDepartments,
    periodPayslips,
    markAllSent,
  } = usePayroll();

  const deptName = (id: string) =>
    clientDepartments.find((d) => d.id === id)?.name ?? "—";

  const totals = periodPayslips.reduce(
    (acc, p) => {
      acc.deductions += p.totalDeductions;
      acc.net += p.net;
      return acc;
    },
    { deductions: 0, net: 0 },
  );

  const sentCount = periodPayslips.filter((p) => p.status === "sent").length;
  const pendingCount = periodPayslips.length - sentCount;

  const rows = periodPayslips
    .map((p) => {
      const employee = clientEmployees.find((e) => e.id === p.employeeId);
      return employee ? { payslip: p, employee } : null;
    })
    .filter((r): r is { payslip: Payslip; employee: Employee } => r !== null);

  const { page, setPage, pageCount, pageRows, from, to, total } = usePagination(rows, 25);

  return (
    <>
      <PageHeader
        title="Payslips"
        description={`${periodLabel(period)} · ${periodPayslips.length} payslips generated`}
        action={
          <div className="flex items-center gap-2">
            {periodPayslips.length > 0 && (
              <Button
                variant="outline"
                disabled={pendingCount === 0}
                onClick={() => {
                  markAllSent(period);
                  toast.add({ title: `Marked ${pendingCount} payslips as sent`, type: "success" });
                }}
              >
                <CheckCheck className="size-4" />
                Mark All Sent
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                  {periodPayslips.length}
                </span>
              </Button>
            )}
            <GeneratePayslipsDialog
              trigger={
                <Button>
                  <Sparkles className="size-4" />
                  Generate Payslips
                </Button>
              }
            />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Payslips" value={periodPayslips.length} trend={<span>{sentCount} sent</span>} />
        <StatCard
          label="Total deductions"
          value={`−${money(totals.deductions, activeClient.currency)}`}
          trend={<span>Across all staff</span>}
        />
        <StatCard
          label="Net payable"
          value={money(totals.net, activeClient.currency)}
          className="border-primary/30 bg-primary/5"
          trend={<span>For {periodLabel(period)}</span>}
        />
      </div>

      {periodPayslips.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <Sparkles className="size-8 text-brand-gold" />
          <p className="text-sm text-muted-foreground">
            No payslips generated for {periodLabel(period)} yet.
          </p>
          <GeneratePayslipsDialog
            trigger={<Button>Generate Payslips</Button>}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map(({ payslip, employee }, i) => (
                  <TableRow key={payslip.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <InitialsAvatar name={employee.name} color={colorForIndex(i)} />
                        <div className="leading-tight">
                          <div className="font-medium text-foreground">{employee.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {employee.position}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {periodLabel(payslip.period)}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {money(payslip.gross, activeClient.currency)}
                    </TableCell>
                    <TableCell className="text-destructive">
                      −{money(payslip.totalDeductions, activeClient.currency)}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {money(payslip.net, activeClient.currency)}
                    </TableCell>
                    <TableCell>
                      <PayslipStatusBadge status={payslip.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <PayslipPreviewDialog
                        employee={employee}
                        payslip={payslip}
                        period={payslip.period}
                        departmentName={deptName(employee.departmentId)}
                        avatarIndex={i}
                        trigger={
                          <Button variant="outline" size="sm">
                            <Eye className="size-3.5" />
                            Preview
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            page={page}
            pageCount={pageCount}
            from={from}
            to={to}
            total={total}
            onPageChange={setPage}
            itemLabel="payslips"
          />
        </div>
      )}
    </>
  );
}
