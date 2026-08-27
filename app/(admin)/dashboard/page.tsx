"use client";

import { useMemo } from "react";
import { Users, Wallet, Building2, FileClock, Sparkles, ArrowUp, ArrowDown, GraduationCap, Receipt, AlertTriangle } from "lucide-react";
import { usePayroll } from "@/lib/store";
import { money, recentPeriods } from "@/lib/format";
import { grossForPeriod, payrollByDepartment, projectedGross, projectedNet, schoolFinancials } from "@/lib/aggregate";
import { PageHeader } from "@/components/payroll/page-header";
import { StatCard } from "@/components/payroll/stat-card";
import { PeriodSwitcher } from "@/components/payroll/period-switcher";
import { GeneratePayslipsDialog } from "@/components/payroll/generate-payslips-dialog";
import { PayrollTrendChart, type TrendPoint } from "@/components/payroll/payroll-trend-chart";
import { NextPaydayCard } from "@/components/payroll/next-payday-card";
import { DepartmentPayrollList } from "@/components/payroll/department-payroll-list";
import { ActivityFeed } from "@/components/payroll/activity-feed";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  const {
    activeClient,
    period,
    clientEmployees,
    clientDepartments,
    clientFields,
    clientPayslips,
    periodPayslips,
    clientLogs,
    clientStudents,
    clientExpenses,
    clientFeePayments,
  } = usePayroll();

  const activeEmployees = clientEmployees.filter((e) => e.status !== "inactive");
  const netPayable = useMemo(
    () => projectedNet(clientEmployees, clientFields),
    [clientEmployees, clientFields],
  );
  const grossPayable = useMemo(
    () => projectedGross(clientEmployees, clientFields),
    [clientEmployees, clientFields],
  );

  const sentThisPeriod = periodPayslips.filter((p) => p.status === "sent").length;
  const pending = activeEmployees.length - sentThisPeriod;

  const trend: TrendPoint[] = useMemo(() => {
    const periods = recentPeriods(period, 6);
    return periods.map((p) => ({
      period: p,
      amount: grossForPeriod(p, clientPayslips, clientEmployees, clientFields),
    }));
  }, [period, clientPayslips, clientEmployees, clientFields]);

  const deptPayroll = useMemo(
    () => payrollByDepartment(clientEmployees, clientFields, clientDepartments),
    [clientEmployees, clientFields, clientDepartments],
  );

  const prevMonthAmount = trend.length > 1 ? trend[trend.length - 2].amount : grossPayable;
  const payrollDelta = prevMonthAmount > 0 ? ((grossPayable - prevMonthAmount) / prevMonthAmount) * 100 : 0;

  const finance = useMemo(
    () => schoolFinancials(clientStudents, clientFeePayments, clientExpenses, period),
    [clientStudents, clientFeePayments, clientExpenses, period],
  );
  const hasStudents = clientStudents.length > 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Payroll overview for ${activeClient.name}`}
        action={
          <div className="flex items-center gap-2">
            <PeriodSwitcher />
            <GeneratePayslipsDialog
              redirectOnGenerate
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Employees"
          value={clientEmployees.length}
          icon={<Users className="size-4.5" />}
          iconClassName="bg-brand-pine-mid/15 text-brand-pine-mid"
          trend={
            <>
              <ArrowUp className="size-3.5" /> Active across {clientDepartments.length} depts
            </>
          }
          trendTone="up"
        />
        <StatCard
          label="Monthly Payroll"
          value={money(grossPayable, activeClient.currency)}
          icon={<Wallet className="size-4.5" />}
          iconClassName="bg-brand-gold/20 text-[oklch(0.42_0.09_70)]"
          trend={
            <>
              {payrollDelta >= 0 ? (
                <ArrowUp className="size-3.5" />
              ) : (
                <ArrowDown className="size-3.5" />
              )}
              {Math.abs(payrollDelta).toFixed(1)}% vs last month
            </>
          }
          trendTone={payrollDelta >= 0 ? "up" : "down"}
        />
        <StatCard
          label="Departments"
          value={clientDepartments.length}
          icon={<Building2 className="size-4.5" />}
          iconClassName="bg-brand-olive/15 text-brand-olive"
          trend={<span>Across {activeClient.name}</span>}
        />
        <StatCard
          label="Payslips Pending"
          value={Math.max(0, pending)}
          icon={<FileClock className="size-4.5" />}
          iconClassName="bg-brand-clay/15 text-brand-clay"
          trend={<span>{sentThisPeriod} sent this period</span>}
        />
      </div>

      {hasStudents && (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-heading text-base font-semibold text-foreground">
              Students & Expenses
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" render={<Link href="/students" />} nativeButton={false}>
                View students
              </Button>
              <Button variant="outline" size="sm" render={<Link href="/expenses" />} nativeButton={false}>
                View expenses
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Students"
              value={finance.studentCount}
              icon={<GraduationCap className="size-4.5" />}
              iconClassName="bg-brand-pine/12 text-brand-pine"
              trend={<span>{finance.socialCaseCount} social cases</span>}
            />
            <StatCard
              label="Fees Collected"
              value={money(finance.feesCollected, activeClient.currency)}
              icon={<Wallet className="size-4.5" />}
              iconClassName="bg-success/12 text-success"
              trend={<span>This period</span>}
            />
            <StatCard
              label="Fees Outstanding"
              value={money(finance.feesOutstanding, activeClient.currency)}
              icon={<AlertTriangle className="size-4.5" />}
              iconClassName="bg-brand-clay/15 text-brand-clay"
              trend={<span>{finance.unpaidCount} unpaid</span>}
            />
            <StatCard
              label="Expenses"
              value={money(finance.expensesThisMonth, activeClient.currency)}
              icon={<Receipt className="size-4.5" />}
              iconClassName="bg-brand-gold/20 text-[oklch(0.42_0.09_70)]"
              trend={<span>Logged this period</span>}
            />
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm xl:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-heading text-base font-semibold text-foreground">
              Payroll Trend
            </h3>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Last 6 months
            </span>
          </div>
          <PayrollTrendChart data={trend} currency={activeClient.currency} />
        </div>

        <NextPaydayCard
          period={period}
          payDay={activeClient.payDay}
          netPayable={netPayable}
          employeeCount={activeEmployees.length}
          currency={activeClient.currency}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DepartmentPayrollList data={deptPayroll} currency={activeClient.currency} />
        </div>
        <ActivityFeed logs={clientLogs} viewAllHref="/audit" />
      </div>
    </>
  );
}
