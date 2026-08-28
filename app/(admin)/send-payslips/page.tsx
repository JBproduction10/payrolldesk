"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Send, Sparkles, Info } from "lucide-react";
import { usePayroll } from "@/lib/store";
import type { Channel, Employee, Payslip } from "@/lib/types";
import { money, periodLabel } from "@/lib/format";
import { colorForIndex } from "@/lib/colors";
import { PageHeader } from "@/components/payroll/page-header";
import { StatCard } from "@/components/payroll/stat-card";
import { InitialsAvatar } from "@/components/payroll/initials-avatar";
import { DeliveryChannels } from "@/components/payroll/delivery-channels";
import { ConfirmSendDialog } from "@/components/payroll/confirm-send-dialog";
import { GeneratePayslipsDialog } from "@/components/payroll/generate-payslips-dialog";
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

export default function SendPayslipsPage() {
  const t = useTranslations("sendPayslipsPage");
  const locale = useLocale() as "en" | "fr";
  const {
    activeClient,
    period,
    clientEmployees,
    clientDepartments,
    periodPayslips,
    setDelivery,
  } = usePayroll();
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());

  const deptName = (id: string) =>
    clientDepartments.find((d) => d.id === id)?.name ?? "—";

  const rows = periodPayslips
    .map((p) => {
      const employee = clientEmployees.find((e) => e.id === p.employeeId);
      return employee ? { payslip: p, employee } : null;
    })
    .filter((r): r is { payslip: Payslip; employee: Employee } => r !== null);

  const pending = rows.filter((r) => r.payslip.status !== "sent");
  const netPending = pending.reduce((sum, r) => sum + r.payslip.net, 0);
  const deliveredCount = rows.length - pending.length;

  async function sendOne(payslip: Payslip, employee: Employee, silent = false) {
    const channels = Object.keys(payslip.delivery) as Channel[];
    if (channels.length === 0) return;
    setSendingIds((s) => new Set(s).add(payslip.id));
    channels.forEach((ch) => setDelivery(payslip.id, ch, "sending"));

    const results = await Promise.all(
      channels.map(async (ch) => {
        if (ch === "email") {
          try {
            const res = await fetch("/api/send-payslip", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: employee.email,
                employeeName: employee.name,
                schoolName: activeClient.name,
                periodLabel: periodLabel(payslip.period, locale),
                currency: activeClient.currency,
                earnings: payslip.lines
                  .filter((l) => l.category === "earning")
                  .map((l) => ({ label: l.label, amount: l.amount })),
                deductions: payslip.lines
                  .filter((l) => l.category === "deduction")
                  .map((l) => ({ label: l.label, amount: l.amount })),
                gross: payslip.gross,
                totalDeductions: payslip.totalDeductions,
                net: payslip.net,
              }),
            });
            const data = await res.json().catch(() => ({ sent: false }));
            return { channel: ch, sent: Boolean(data.sent) };
          } catch {
            return { channel: ch, sent: false };
          }
        }
        // No WhatsApp Business API connected yet — this stays simulated
        // until that integration exists, unlike email above which is real.
        await new Promise((resolve) => setTimeout(resolve, 900));
        return { channel: ch, sent: true };
      }),
    );

    results.forEach(({ channel, sent }) => setDelivery(payslip.id, channel, sent ? "sent" : "failed"));
    setSendingIds((s) => {
      const next = new Set(s);
      next.delete(payslip.id);
      return next;
    });

    if (!silent) {
      const allSent = results.every((r) => r.sent);
      toast.add({
        title: allSent
          ? t("deliveredToast", { name: employee.name })
          : t("someFailedToast", { name: employee.name }),
        type: allSent ? "success" : "error",
      });
    }
  }

  async function sendAll() {
    if (pending.length === 0) return;
    toast.add({
      title: t("sendingToast", { count: pending.length }),
      description: t("sendingDescription"),
      type: "info",
    });
    await Promise.all(pending.map((r) => sendOne(r.payslip, r.employee, true)));
    toast.add({ title: t("finishedToast"), type: "success" });
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description", { period: periodLabel(period, locale) })}
        action={
          rows.length > 0 && (
            <Button onClick={sendAll} disabled={pending.length === 0}>
              <Send className="size-4" />
              {t("sendAllDrafts")}
              <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-xs">
                {pending.length}
              </span>
            </Button>
          )
        }
      />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-border bg-secondary/60 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <Info className="size-4.5" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("infoTitle")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("infoBody")}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("readyToSend")} value={pending.length} trend={<span>{t("draftPayslips")}</span>} />
        <StatCard
          label={t("netPayablePending")}
          value={money(netPending, activeClient.currency, locale)}
          trend={<span>{t("toBeDelivered")}</span>}
        />
        <StatCard label={t("delivered")} value={deliveredCount} trend={<span>{t("payslipsSent")}</span>} />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <Sparkles className="size-8 text-brand-gold" />
          <p className="text-sm text-muted-foreground">
            {t("noPayslipsYet", { period: periodLabel(period, locale) })}
          </p>
          <GeneratePayslipsDialog trigger={<Button>{t("generatePayslips")}</Button>} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="mb-0 flex items-center justify-between px-5 pt-5">
            <h3 className="font-heading text-base font-semibold text-foreground">
              {t("readyToSend")}
            </h3>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {t("pending", { count: pending.length })}
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("columnEmployee")}</TableHead>
                  <TableHead>{t("columnDepartment")}</TableHead>
                  <TableHead>{t("columnNetPay")}</TableHead>
                  <TableHead>{t("columnEmail")}</TableHead>
                  <TableHead>{t("columnChannels")}</TableHead>
                  <TableHead className="text-right">{t("columnAction")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ payslip, employee }, i) => {
                  const isSent = payslip.status === "sent";
                  const isSending = sendingIds.has(payslip.id);
                  return (
                    <TableRow key={payslip.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <InitialsAvatar name={employee.name} color={colorForIndex(i)} />
                          <div className="leading-tight">
                            <div className="font-medium text-foreground">
                              {employee.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {employee.position}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {deptName(employee.departmentId)}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {money(payslip.net, activeClient.currency, locale)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {employee.email}
                      </TableCell>
                      <TableCell>
                        <DeliveryChannels delivery={payslip.delivery} />
                      </TableCell>
                      <TableCell className="text-right">
                        {isSent ? (
                          <span className="text-xs font-medium text-success">{t("delivered")}</span>
                        ) : (
                          <ConfirmSendDialog
                            employee={employee}
                            netPay={payslip.net}
                            currency={activeClient.currency}
                            period={period}
                            channels={Object.keys(payslip.delivery)}
                            avatarIndex={i}
                            onConfirm={() => sendOne(payslip, employee)}
                            trigger={
                              <Button size="sm" disabled={isSending}>
                                <Send className="size-3.5" />
                                {isSending ? t("sending") : t("send")}
                              </Button>
                            }
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </>
  );
}
