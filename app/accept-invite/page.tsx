"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_KEY: Record<string, string> = {
  super_admin: "roleSuperAdmin",
  promoter: "rolePromoter",
  school_admin: "roleSchoolAdmin",
  teacher: "roleTeacher",
  finance: "roleFinance",
  treasury: "roleTreasury",
  cashier: "roleCashier",
  intendance: "roleIntendance",
};

function AcceptInviteForm() {
  const t = useTranslations("auth.acceptInvite");
  const tRole = useTranslations("teamPage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [checking, setChecking] = useState(true);
  const [invite, setInvite] = useState<{ name: string; email: string; role: string } | null>(
    null,
  );
  const [checkError, setCheckError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setCheckError(t("missingLink"));
      setChecking(false);
      return;
    }
    fetch(`/api/auth/accept-invite?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setCheckError(data.error || t("expiredOrInvalid"));
          return;
        }
        setInvite(data);
      })
      .catch(() => setCheckError(t("couldNotReachServer")))
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t("passwordsDontMatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("errorSetPasswordFailed"));
        setLoading(false);
        return;
      }
      const signInRes = await signIn("credentials", {
        email: invite?.email,
        password,
        redirect: false,
      });
      if (signInRes?.error) {
        router.push("/login");
        return;
      }
      const destination = invite?.role === "super_admin" ? "/dashboard" : "/portal";
      router.push(destination);
      router.refresh();
    } catch {
      setError(t("errorGeneric"));
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <AuthCard title={t("checkingTitle")} description={t("checkingDescription")}>
        <div className="flex justify-center py-4 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      </AuthCard>
    );
  }

  if (checkError || !invite) {
    return (
      <AuthCard title={t("notFoundTitle")} description={checkError ?? t("notFoundDescriptionFallback")}>
        <Button className="w-full" onClick={() => router.push("/login")}>
          {t("goToSignIn")}
        </Button>
      </AuthCard>
    );
  }

  const roleLabel = ROLE_KEY[invite.role] ? tRole(ROLE_KEY[invite.role]) : invite.role;

  return (
    <AuthCard
      title={t("title")}
      description={t("descriptionWelcome", { name: invite.name, role: roleLabel })}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>{t("emailLabel")}</Label>
          <Input value={invite.email} disabled />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ai-password">{t("passwordLabel")}</Label>
          <Input
            id="ai-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ai-confirm">{t("confirmPasswordLabel")}</Label>
          <Input
            id="ai-confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteForm />
    </Suspense>
  );
}
