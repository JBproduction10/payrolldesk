"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Mail } from "lucide-react";
import { usePayroll } from "@/lib/store";
import type { Role } from "@/lib/types";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  clientId: string | null;
  employeeId: string | null;
  status: "active" | "pending";
  createdAt: string;
}

const ROLE_KEYS: { value: Role; labelKey: string; hintKey: string }[] = [
  { value: "promoter", labelKey: "roleLabel", hintKey: "roleHintPromoter" },
  { value: "treasury", labelKey: "roleTreasury", hintKey: "roleHintTreasury" },
  { value: "school_admin", labelKey: "roleSchoolAdmin", hintKey: "roleHintSchoolAdmin" },
  { value: "cashier", labelKey: "roleCashier", hintKey: "roleHintCashier" },
  { value: "finance", labelKey: "roleFinance", hintKey: "roleHintFinance" },
  { value: "intendance", labelKey: "roleIntendance", hintKey: "roleHintIntendance" },
  { value: "teacher", labelKey: "roleTeacher", hintKey: "roleHintTeacher" },
];

interface InviteResult {
  name: string;
  email: string;
  inviteSent: boolean;
  inviteLink: string;
}

export function TeamFormDialog({
  member,
  trigger,
  onSaved,
}: {
  /** Pass an existing member to edit it — omit to create a new one. */
  member?: TeamMember;
  /** Custom trigger element — defaults to an "Add Team Member" button when creating. */
  trigger?: React.ReactElement;
  onSaved: () => void;
}) {
  const t = useTranslations("teamForm");
  const { clients, employees } = usePayroll();
  const isEdit = Boolean(member);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("school_admin");
  const [clientId, setClientId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  const needsClient =
    role === "school_admin" ||
    role === "finance" ||
    role === "teacher" ||
    role === "cashier" ||
    role === "intendance";
  const needsEmployee = role === "teacher";
  const employeeOptions = employees.filter((e) => e.clientId === clientId);

  useEffect(() => {
    if (!open) return;
    if (member) {
      setName(member.name);
      setEmail(member.email);
      setRole(member.role === "super_admin" ? "school_admin" : member.role);
      setClientId(member.clientId ?? "");
      setEmployeeId(member.employeeId ?? "");
    } else {
      setName("");
      setEmail("");
      setRole("school_admin");
      setClientId("");
      setEmployeeId("");
    }
    setError(null);
    setResult(null);
    setCopied(false);
  }, [open, member]);

  const valid =
    name.trim() && email.trim() && (!needsClient || clientId) && (!needsEmployee || employeeId);

  async function handleSubmit() {
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      if (isEdit && member) {
        const res = await fetch(`/api/team/${member.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            role,
            clientId: needsClient ? clientId : null,
            employeeId: needsEmployee ? employeeId : null,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t("updateErrorFallback"));
          return;
        }
        toast.add({ title: t("updatedToast", { name: name.trim() }), type: "success" });
        setOpen(false);
        onSaved();
        return;
      }

      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          clientId: needsClient ? clientId : null,
          employeeId: needsEmployee ? employeeId : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("createErrorFallback"));
        return;
      }
      setResult({
        name: name.trim(),
        email: data.email,
        inviteSent: data.inviteSent,
        inviteLink: data.inviteLink,
      });
      onSaved();
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.add({ title: t("copyErrorToast"), type: "error" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button>{t("addTeamMember")}</Button>} />
      <DialogContent className="sm:max-w-md">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("addedTitle", { name: result.name })}</DialogTitle>
              <DialogDescription>
                {result.inviteSent ? (
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    {t("inviteSentDescription", { email: result.email })}
                  </span>
                ) : (
                  t("noEmailDescription", { email: result.email })
                )}
              </DialogDescription>
            </DialogHeader>

            {!result.inviteSent && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
                <Input readOnly value={result.inviteLink} className="text-xs" />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setOpen(false)}>{t("done")}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{isEdit ? t("editTitle") : t("addTitle")}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? t("editDescription")
                  : t("addDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tf-role">{t("role")}</Label>
                <NativeSelect
                  id="tf-role"
                  className="w-full"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value as Role);
                    setClientId("");
                    setEmployeeId("");
                  }}
                >
                  {ROLE_KEYS.map((r) => (
                    <NativeSelectOption key={r.value} value={r.value}>
                      {t(r.labelKey)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <p className="text-xs text-muted-foreground">
                  {t(ROLE_KEYS.find((r) => r.value === role)?.hintKey ?? "roleHintPromoter")}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tf-name">{t("fullName")}</Label>
                <Input id="tf-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tf-email">{t("email")}</Label>
                <Input
                  id="tf-email"
                  type="email"
                  value={email}
                  disabled={isEdit}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {isEdit && (
                  <p className="text-xs text-muted-foreground">
                    {t("emailLockedHint")}
                  </p>
                )}
              </div>

              {needsClient && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tf-client">{t("school")}</Label>
                  <NativeSelect
                    id="tf-client"
                    className="w-full"
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      setEmployeeId("");
                    }}
                  >
                    <NativeSelectOption value="">{t("selectSchool")}</NativeSelectOption>
                    {clients.map((c) => (
                      <NativeSelectOption key={c.id} value={c.id}>
                        {c.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              )}

              {needsEmployee && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tf-employee">{t("employeeRecord")}</Label>
                  <NativeSelect
                    id="tf-employee"
                    className="w-full"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    disabled={!clientId}
                  >
                    <NativeSelectOption value="">
                      {clientId ? t("selectEmployee") : t("pickSchoolFirst")}
                    </NativeSelectOption>
                    {employeeOptions.map((e) => (
                      <NativeSelectOption key={e.id} value={e.id}>
                        {e.name} — {e.position}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={!valid || loading}>
                {loading
                  ? isEdit
                    ? t("saving")
                    : t("sendingInvite")
                  : isEdit
                    ? t("saveChanges")
                    : t("sendInvite")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
