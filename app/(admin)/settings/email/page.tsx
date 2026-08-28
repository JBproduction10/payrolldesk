"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Mail, Send, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/payroll/page-header";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProviderKind = "resend" | "sendgrid" | "smtp";

interface EmailConfigView {
  provider: ProviderKind;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  smtp: { host: string; port: number; secure: boolean; user: string; hasPassword: boolean };
  sendgrid: { hasApiKey: boolean };
  resend: { hasApiKey: boolean };
  notifications: {
    invite: boolean;
    passwordReset: boolean;
    payslip: boolean;
    feeReminder: boolean;
  };
  configured: boolean;
  updatedAt: string | null;
}

const PROVIDER_LABEL_KEY: Record<ProviderKind, string> = {
  resend: "providerResend",
  sendgrid: "providerSendgrid",
  smtp: "providerSmtp",
};

const NOTIFICATION_LABEL_KEY: Record<keyof EmailConfigView["notifications"], { labelKey: string; hintKey: string }> = {
  invite: { labelKey: "notifInviteLabel", hintKey: "notifInviteHint" },
  passwordReset: { labelKey: "notifPasswordResetLabel", hintKey: "notifPasswordResetHint" },
  payslip: { labelKey: "notifPayslipLabel", hintKey: "notifPayslipHint" },
  feeReminder: { labelKey: "notifFeeReminderLabel", hintKey: "notifFeeReminderHint" },
};

export default function EmailSettingsPage() {
  const t = useTranslations("emailSettingsPage");
  const [config, setConfig] = useState<EmailConfigView | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  // Credential inputs are kept separate from `config` — the server never
  // sends saved secrets back, so these start blank and are only included
  // in the save request if the admin actually types something new.
  const [smtpPassword, setSmtpPassword] = useState("");
  const [sendgridKey, setSendgridKey] = useState("");
  const [resendKey, setResendKey] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email-config", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setConfig(data);
      else toast.add({ title: data.error ?? t("loadErrorToast"), type: "error" });
    } catch {
      toast.add({ title: t("loadErrorToast"), type: "error" });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  function update<K extends keyof EmailConfigView>(key: K, value: EmailConfigView[K]) {
    setConfig((c) => (c ? { ...c, [key]: value } : c));
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: config.provider,
          fromName: config.fromName,
          fromEmail: config.fromEmail,
          replyTo: config.replyTo,
          smtp: { ...config.smtp, password: smtpPassword || undefined },
          sendgrid: { apiKey: sendgridKey || undefined },
          resend: { apiKey: resendKey || undefined },
          notifications: config.notifications,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.add({ title: data.error ?? t("saveErrorToast"), type: "error" });
        return;
      }
      setConfig(data);
      setSmtpPassword("");
      setSendgridKey("");
      setResendKey("");
      toast.add({ title: t("savedToast"), type: "success" });
    } catch {
      toast.add({ title: t("saveFailedToast"), type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!testTo.trim()) return;
    setTesting(true);
    try {
      const res = await fetch("/api/admin/email-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.add({ title: t("testSentToast", { email: testTo.trim() }), type: "success" });
      } else {
        toast.add({ title: data.error ?? t("testFailedToast"), type: "error" });
      }
    } catch {
      toast.add({ title: t("testFailedToast"), type: "error" });
    } finally {
      setTesting(false);
    }
  }

  if (loading || !config) {
    return (
      <>
        <PageHeader title={t("title")} description={t("shortDescription")} />
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              {t("providerTitle")}
            </CardTitle>
            <CardDescription>
              {config.configured
                ? t("configuredDescription")
                : t("notConfiguredDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2 sm:max-w-xs">
              <Label>{t("sendUsing")}</Label>
              <Select
                value={config.provider}
                onValueChange={(v) => v && update("provider", v as ProviderKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROVIDER_LABEL_KEY) as ProviderKind[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(PROVIDER_LABEL_KEY[p])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t("fromName")}</Label>
                <Input
                  value={config.fromName}
                  onChange={(e) => update("fromName", e.target.value)}
                  placeholder="Payroll Desk"
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("fromEmail")}</Label>
                <Input
                  type="email"
                  value={config.fromEmail}
                  onChange={(e) => update("fromEmail", e.target.value)}
                  placeholder="noreply@yourschool.com"
                />
              </div>
            </div>

            <div className="grid gap-2 sm:max-w-sm">
              <Label>{t("replyTo")}</Label>
              <Input
                type="email"
                value={config.replyTo}
                onChange={(e) => update("replyTo", e.target.value)}
                placeholder="admin@yourschool.com"
              />
            </div>

            {config.provider === "resend" && (
              <div className="grid gap-2 sm:max-w-sm">
                <Label>{t("resendApiKey")}</Label>
                <Input
                  type="password"
                  value={resendKey}
                  onChange={(e) => setResendKey(e.target.value)}
                  placeholder={config.resend.hasApiKey ? t("savedLeaveBlank") : "re_..."}
                />
              </div>
            )}

            {config.provider === "sendgrid" && (
              <div className="grid gap-2 sm:max-w-sm">
                <Label>{t("sendgridApiKey")}</Label>
                <Input
                  type="password"
                  value={sendgridKey}
                  onChange={(e) => setSendgridKey(e.target.value)}
                  placeholder={config.sendgrid.hasApiKey ? t("savedLeaveBlank") : "SG...."}
                />
              </div>
            )}

            {config.provider === "smtp" && (
              <div className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("smtpHost")}</Label>
                  <Input
                    value={config.smtp.host}
                    onChange={(e) => update("smtp", { ...config.smtp, host: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("port")}</Label>
                  <Input
                    type="number"
                    value={config.smtp.port}
                    onChange={(e) =>
                      update("smtp", { ...config.smtp, port: Number(e.target.value) || 587 })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("username")}</Label>
                  <Input
                    value={config.smtp.user}
                    onChange={(e) => update("smtp", { ...config.smtp, user: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("password")}</Label>
                  <Input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder={config.smtp.hasPassword ? t("savedLeaveBlank") : ""}
                  />
                </div>
                <Label className="flex items-center gap-2 sm:col-span-2">
                  <Switch
                    checked={config.smtp.secure}
                    onCheckedChange={(checked) =>
                      update("smtp", { ...config.smtp, secure: checked === true })
                    }
                  />
                  {t("useTls")}
                </Label>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {t("saveSettings")}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("notificationsTitle")}</CardTitle>
            <CardDescription>{t("notificationsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {(Object.keys(NOTIFICATION_LABEL_KEY) as (keyof EmailConfigView["notifications"])[]).map(
              (key) => (
                <div key={key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t(NOTIFICATION_LABEL_KEY[key].labelKey)}</p>
                    <p className="text-xs text-muted-foreground">{t(NOTIFICATION_LABEL_KEY[key].hintKey)}</p>
                  </div>
                  <Switch
                    checked={config.notifications[key]}
                    onCheckedChange={(checked) =>
                      update("notifications", { ...config.notifications, [key]: checked === true })
                    }
                  />
                </div>
              ),
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="size-4 text-muted-foreground" />
              {t("sendTestTitle")}
            </CardTitle>
            <CardDescription>
              {t("sendTestDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 sm:max-w-sm sm:flex-row">
              <Input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="you@example.com"
              />
              <Button variant="outline" onClick={handleTest} disabled={testing || !testTo.trim()}>
                {testing && <Loader2 className="size-4 animate-spin" />}
                {t("sendTest")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
