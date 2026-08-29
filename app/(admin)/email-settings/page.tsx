"use client";

import { useEffect, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/payroll/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toast } from "@/components/ui/toast";
import type { EmailNotificationType } from "@/lib/db/email-config";
import type { EmailProviderType } from "@/lib/email/providers/interface";

interface EmailConfigForm {
  provider: EmailProviderType;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  resend: { apiKey: string };
  sendgrid: { apiKey: string };
  smtp: { host: string; port: number; secure: boolean; user: string; password: string };
  notifications: Record<EmailNotificationType, boolean>;
}

const NOTIFICATION_LABEL: Record<EmailNotificationType, string> = {
  invite: "Team invites",
  passwordReset: "Password reset links",
  payslip: "Payslip delivery",
  feeReminder: "Fee reminders",
  requisition: "Requisitions",
};

export default function EmailSettingsPage() {
  const [form, setForm] = useState<EmailConfigForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/email-config", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setForm(data.config))
      .catch(() => toast.add({ title: "Couldn't load email settings", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm(data.config);
      toast.add({ title: "Email settings saved" });
    } catch (err) {
      toast.add({
        title: err instanceof Error ? err.message : "Couldn't save email settings",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testTo.trim()) return;
    setTesting(true);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.add({ title: `Test email sent to ${testTo.trim()}` });
      } else {
        toast.add({ title: data.error ?? "Test email failed", type: "error" });
      }
    } catch {
      toast.add({ title: "Test email failed", type: "error" });
    } finally {
      setTesting(false);
    }
  };

  if (loading || !form) {
    return (
      <>
        <PageHeader
          title="Email Settings"
          description="Choose how Payroll Desk sends invites, payslips, and reminders."
        />
        <div className="flex items-center gap-2 py-16 justify-center text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Email Settings"
        description="Choose how Payroll Desk sends invites, payslips, and reminders — and which of those it's allowed to send."
      />

      <div className="flex flex-col gap-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-heading text-base font-semibold text-foreground">Provider</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="provider">Send email via</Label>
              <NativeSelect
                id="provider"
                className="mt-1.5 w-full"
                value={form.provider}
                onChange={(e) =>
                  setForm({ ...form, provider: e.target.value as EmailProviderType })
                }
              >
                <NativeSelectOption value="resend">Resend</NativeSelectOption>
                <NativeSelectOption value="smtp">SMTP (incl. Outlook/Office365)</NativeSelectOption>
                <NativeSelectOption value="sendgrid">SendGrid</NativeSelectOption>
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="fromName">From name</Label>
              <Input
                id="fromName"
                className="mt-1.5"
                value={form.fromName}
                onChange={(e) => setForm({ ...form, fromName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="fromEmail">From email</Label>
              <Input
                id="fromEmail"
                type="email"
                className="mt-1.5"
                value={form.fromEmail}
                onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="replyTo">Reply-to (optional)</Label>
              <Input
                id="replyTo"
                type="email"
                className="mt-1.5"
                value={form.replyTo}
                onChange={(e) => setForm({ ...form, replyTo: e.target.value })}
              />
            </div>
          </div>

          {form.provider === "resend" && (
            <div className="mt-4">
              <Label htmlFor="resendKey">Resend API key</Label>
              <Input
                id="resendKey"
                type="password"
                className="mt-1.5"
                placeholder="re_••••••••"
                value={form.resend.apiKey}
                onChange={(e) => setForm({ ...form, resend: { apiKey: e.target.value } })}
              />
            </div>
          )}

          {form.provider === "sendgrid" && (
            <div className="mt-4">
              <Label htmlFor="sendgridKey">SendGrid API key</Label>
              <Input
                id="sendgridKey"
                type="password"
                className="mt-1.5"
                placeholder="SG.••••••••"
                value={form.sendgrid.apiKey}
                onChange={(e) => setForm({ ...form, sendgrid: { apiKey: e.target.value } })}
              />
            </div>
          )}

          {form.provider === "smtp" && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="smtpHost">Host</Label>
                <Input
                  id="smtpHost"
                  className="mt-1.5"
                  placeholder="smtp.office365.com"
                  value={form.smtp.host}
                  onChange={(e) => setForm({ ...form, smtp: { ...form.smtp, host: e.target.value } })}
                />
              </div>
              <div>
                <Label htmlFor="smtpPort">Port</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  className="mt-1.5"
                  value={form.smtp.port}
                  onChange={(e) =>
                    setForm({ ...form, smtp: { ...form.smtp, port: Number(e.target.value) } })
                  }
                />
              </div>
              <div>
                <Label htmlFor="smtpUser">Username</Label>
                <Input
                  id="smtpUser"
                  className="mt-1.5"
                  value={form.smtp.user}
                  onChange={(e) => setForm({ ...form, smtp: { ...form.smtp, user: e.target.value } })}
                />
              </div>
              <div>
                <Label htmlFor="smtpPassword">Password</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  className="mt-1.5"
                  placeholder="••••••••"
                  value={form.smtp.password}
                  onChange={(e) =>
                    setForm({ ...form, smtp: { ...form.smtp, password: e.target.value } })
                  }
                />
              </div>
              <label className="flex items-center gap-2 sm:col-span-2">
                <Switch
                  checked={form.smtp.secure}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, smtp: { ...form.smtp, secure: checked === true } })
                  }
                />
                <span className="text-sm text-foreground">
                  Use SSL (leave off for STARTTLS on port 587 — e.g. Office365)
                </span>
              </label>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-heading text-base font-semibold text-foreground">Notifications</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Turn any of these off without touching the provider above — the app keeps
            working either way (invites and resets just fall back to showing a
            copyable link).
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {(Object.keys(NOTIFICATION_LABEL) as EmailNotificationType[]).map((key) => (
              <label key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground">{NOTIFICATION_LABEL[key]}</span>
                <Switch
                  checked={form.notifications[key]}
                  onCheckedChange={(checked) =>
                    setForm({
                      ...form,
                      notifications: { ...form.notifications, [key]: checked === true },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save settings
          </Button>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-heading text-base font-semibold text-foreground">Send a test email</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifies the connection and sends a real message through whatever&apos;s
            saved above — save your changes first.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Input
              type="email"
              placeholder="you@example.com"
              className="max-w-xs"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
            <Button variant="outline" onClick={sendTest} disabled={testing || !testTo.trim()}>
              {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Send test
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
