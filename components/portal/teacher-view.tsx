"use client";

import { useTranslations, useLocale } from "next-intl";
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
  const t = useTranslations("teacherView");
  const locale = useLocale() as "en" | "fr";
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("description", { name: employee.name, position: employee.position, schoolName: client.name })}
        </p>
      </div>

      {payslips.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <ReceiptText className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t("noPayslipsYet")}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">{t("columnPeriod")}</th>
                  <th className="px-4 py-3 font-medium">{t("columnGross")}</th>
                  <th className="px-4 py-3 font-medium">{t("columnDeductions")}</th>
                  <th className="px-4 py-3 font-medium">{t("columnNetPay")}</th>
                  <th className="px-4 py-3 font-medium">{t("columnStatus")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("columnView")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payslips.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {periodLabel(p.period, locale)}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {money(p.gross, client.currency, locale)}
                    </td>
                    <td className="px-4 py-3 text-destructive">
                      −{money(p.totalDeductions, client.currency, locale)}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {money(p.net, client.currency, locale)}
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
                            {t("view")}
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
