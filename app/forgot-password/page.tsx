"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      // Always show the same confirmation, regardless of what happened
      // server-side — this page never reveals whether an email is registered.
      setSent(true);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthCard title={t("sentTitle")} description={t("sentDescription")}>
        <div className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2.5 text-sm text-secondary-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {t("sentBody")}
        </div>
        <Button className="mt-4 w-full" render={<Link href="/login" />} nativeButton={false}>
          {t("backToSignIn")}
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("title")} description={t("description")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fp-email">{t("emailLabel")}</Label>
          <Input
            id="fp-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
          />
        </div>

        <Button type="submit" className="mt-2" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          {t("submit")}
        </Button>
      </form>
    </AuthCard>
  );
}
