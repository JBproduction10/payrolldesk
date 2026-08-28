"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
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
  const t = useTranslations("dashboardPage");
  const locale = useLocale() as "en" | "fr";
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
        title={t("title")}
        description={t("description", { schoolName: activeClient.name })}
        action={
          <div className="flex items-center gap-2">
            <PeriodSwitcher />
            <GeneratePayslipsDialog
              redirectOnGenerate
              trigger={
                <Button>
                  <Sparkles className="size-4" />
                  {t("generatePayslips")}
                </Button>
              }
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("totalEmployees")}
          value={clientEmployees.length}
          icon={<Users className="size-4.5" />}
          iconClassName="bg-brand-pine-mid/15 text-brand-pine-mid"
          trend={
            <>
              <ArrowUp className="size-3.5" /> {t("activeAcrossDepts", { count: clientDepartments.length })}
            </>
          }
          trendTone="up"
        />
        <StatCard
          label={t("monthlyPayroll")}
          value={money(grossPayable, activeClient.currency, locale)}
          icon={<Wallet className="size-4.5" />}
          iconClassName="bg-brand-gold/20 text-[oklch(0.42_0.09_70)]"
          trend={
            <>
              {payrollDelta >= 0 ? (
                <ArrowUp className="size-3.5" />
              ) : (
                <ArrowDown className="size-3.5" />
              )}
              {t("vsLastMonth", { delta: Math.abs(payrollDelta).toFixed(1) })}
            </>
          }
          trendTone={payrollDelta >= 0 ? "up" : "down"}
        />
        <StatCard
          label={t("departments")}
          value={clientDepartments.length}
          icon={<Building2 className="size-4.5" />}
          iconClassName="bg-brand-olive/15 text-brand-olive"
          trend={<span>{t("across", { schoolName: activeClient.name })}</span>}
        />
        <StatCard
          label={t("payslipsPending")}
          value={Math.max(0, pending)}
          icon={<FileClock className="size-4.5" />}
          iconClassName="bg-brand-clay/15 text-brand-clay"
          trend={<span>{t("sentThisPeriod", { count: sentThisPeriod })}</span>}
        />
      </div>

      {hasStudents && (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-heading text-base font-semibold text-foreground">
              {t("studentsAndExpenses")}
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" render={<Link href="/students" />} nativeButton={false}>
                {t("viewStudents")}
              </Button>
              <Button variant="outline" size="sm" render={<Link href="/expenses" />} nativeButton={false}>
                {t("viewExpenses")}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("students")}
              value={finance.studentCount}
              icon={<GraduationCap className="size-4.5" />}
              iconClassName="bg-brand-pine/12 text-brand-pine"
              trend={<span>{t("socialCases", { count: finance.socialCaseCount })}</span>}
            />
            <StatCard
              label={t("feesCollected")}
              value={money(finance.feesCollected, activeClient.currency, locale)}
              icon={<Wallet className="size-4.5" />}
              iconClassName="bg-success/12 text-success"
              trend={<span>{t("thisPeriod")}</span>}
            />
            <StatCard
              label={t("feesOutstanding")}
              value={money(finance.feesOutstanding, activeClient.currency, locale)}
              icon={<AlertTriangle className="size-4.5" />}
              iconClassName="bg-brand-clay/15 text-brand-clay"
              trend={<span>{t("unpaid", { count: finance.unpaidCount })}</span>}
            />
            <StatCard
              label={t("expenses")}
              value={money(finance.expensesThisMonth, activeClient.currency, locale)}
              icon={<Receipt className="size-4.5" />}
              iconClassName="bg-brand-gold/20 text-[oklch(0.42_0.09_70)]"
              trend={<span>{t("loggedThisPeriod")}</span>}
            />
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm xl:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-heading text-base font-semibold text-foreground">
              {t("payrollTrend")}
            </h3>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {t("last6Months")}
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
