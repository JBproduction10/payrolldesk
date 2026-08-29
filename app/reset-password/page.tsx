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

function ResetPasswordForm() {
  const t = useTranslations("auth.resetPassword");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [checking, setChecking] = useState(true);
  const [account, setAccount] = useState<{ name: string; email: string; role: string } | null>(
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
    // Reuses the invite-token validation endpoint — the token mechanism is
    // identical whether it came from an invite or a password-reset request.
    fetch(`/api/auth/accept-invite?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setCheckError(data.error || t("expiredOrInvalid"));
          return;
        }
        setAccount(data);
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
        setError(data.error || t("errorResetFailed"));
        setLoading(false);
        return;
      }
      const signInRes = await signIn("credentials", {
        email: account?.email,
        password,
        redirect: false,
      });
      if (signInRes?.error) {
        router.push("/login");
        return;
      }
      const destination = account?.role === "super_admin" ? "/dashboard" : "/portal";
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

  if (checkError || !account) {
    return (
      <AuthCard
        title={t("invalidTitle")}
        description={checkError ?? t("invalidDescriptionFallback")}
      >
        <Button className="w-full" onClick={() => router.push("/forgot-password")}>
          {t("requestNewLink")}
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("title")} description={t("descriptionFor", { email: account.email })}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rp-password">{t("newPasswordLabel")}</Label>
          <Input
            id="rp-password"
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
          <Label htmlFor="rp-confirm">{t("confirmPasswordLabel")}</Label>
          <Input
            id="rp-confirm"
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
