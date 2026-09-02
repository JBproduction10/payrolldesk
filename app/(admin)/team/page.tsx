"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, UserCog, Send, Check, Copy, Pencil, Download } from "lucide-react";
import { usePayroll } from "@/lib/store";
import type { Role } from "@/lib/types";
import { PageHeader } from "@/components/payroll/page-header";
import { TeamFormDialog, type TeamMember } from "@/components/payroll/team-form-dialog";
import { ConfirmDeleteDialog } from "@/components/payroll/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLE_LABEL_KEY: Record<Role, string> = {
  // Platform admins never appear in this list (they're outside every
  // promoter's org), but the Role union requires an exhaustive map.
  platform_admin: "roleSuperAdmin",
  super_admin: "roleSuperAdmin",
  promoter: "rolePromoter",
  school_admin: "roleSchoolAdmin",
  teacher: "roleTeacher",
  finance: "roleFinance",
  treasury: "roleTreasury",
  cashier: "roleCashier",
  intendance: "roleIntendance",
};

export default function TeamPage() {
  const t = useTranslations("teamPage");
  const { clients, employees } = usePayroll();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendLink, setResendLink] = useState<{ email: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setMembers(data.members);
    } catch {
      toast.add({ title: t("loadErrorToast"), type: "error" });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/team/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMembers((m) => m.filter((x) => x.id !== id));
      toast.add({ title: t("accountRemovedToast"), type: "success" });
    } else {
      const data = await res.json().catch(() => ({}));
      toast.add({ title: data.error || t("removeErrorToast"), type: "error" });
    }
  }

  async function handleResend(member: TeamMember) {
    const res = await fetch(`/api/team/${member.id}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.add({ title: data.error || t("resendErrorToast"), type: "error" });
      return;
    }
    if (data.inviteSent) {
      toast.add({ title: t("inviteResentToast", { email: member.email }), type: "success" });
    } else {
      setResendLink({ email: member.email, link: data.inviteLink });
    }
  }

  async function copyLink() {
    if (!resendLink) return;
    try {
      await navigator.clipboard.writeText(resendLink.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.add({ title: t("copyErrorToast"), type: "error" });
    }
  }

  const clientName = (id: string | null) =>
    id ? clients.find((c) => c.id === id)?.name ?? "—" : t("allSchools");
  const employeeName = (id: string | null) =>
    id ? employees.find((e) => e.id === id)?.name ?? "—" : "—";

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <a href="/api/export" download>
                  <Download className="size-4" />
                  {t("downloadBackup")}
                </a>
              }
            />
            <TeamFormDialog onSaved={load} />
          </div>
        }
      />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-border bg-secondary/60 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <UserCog className="size-4.5" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("howAccessWorksTitle")}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("howAccessWorksBody")}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("columnName")}</TableHead>
                <TableHead>{t("columnRole")}</TableHead>
                <TableHead>{t("columnSchool")}</TableHead>
                <TableHead>{t("columnLinkedEmployee")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
                <TableHead className="text-right">{t("columnActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    {t("loadingTeam")}
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    {t("noTeamYet")}
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                        {t(ROLE_LABEL_KEY[m.role])}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {clientName(m.clientId)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.role === "teacher" ? employeeName(m.employeeId) : "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          m.status === "active"
                            ? "bg-success/12 text-success"
                            : "bg-brand-gold/20 text-[oklch(0.42_0.09_70)]"
                        }`}
                      >
                        {m.status === "active" ? t("active") : t("invitePending")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {m.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleResend(m)}
                            aria-label={t("resendInvite")}
                          >
                            <Send className="size-3.5" />
                          </Button>
                        )}
                        <TeamFormDialog
                          member={m}
                          onSaved={load}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label={t("edit")}>
                              <Pencil className="size-3.5" />
                            </Button>
                          }
                        />
                        <ConfirmDeleteDialog
                          title={t("removeConfirmTitle", { name: m.name })}
                          description={t("removeConfirmDescription")}
                          onConfirm={() => handleDelete(m.id)}
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={Boolean(resendLink)} onOpenChange={(next) => !next && setResendLink(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("inviteLinkReadyTitle")}</DialogTitle>
            <DialogDescription>
              {t("inviteLinkReadyDescription", { email: resendLink?.email ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
            <Input readOnly value={resendLink?.link ?? ""} className="text-xs" />
            <Button variant="outline" size="icon" onClick={copyLink}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setResendLink(null)}>{t("done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
