"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Availability = "checking" | "available" | "taken" | "error";

export default function SetupPage() {
  const t = useTranslations("auth.setup");
  const router = useRouter();
  const [availability, setAvailability] = useState<Availability>("checking");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/setup")
      .then((res) => res.json())
      .then((data) => setAvailability(data.available ? "available" : "taken"))
      .catch(() => setAvailability("error"));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("errorCreateAccount"));
        setLoading(false);
        return;
      }
      const signInRes = await signIn("credentials", { email, password, redirect: false });
      if (signInRes?.error) {
        setError(t("errorCreatedPleaseSignIn"));
        setLoading(false);
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("errorGeneric"));
      setLoading(false);
    }
  }

  if (availability === "checking") {
    return (
      <AuthCard title={t("checkingTitle")} description={t("checkingDescription")}>
        <div className="flex justify-center py-4 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      </AuthCard>
    );
  }

  if (availability === "taken") {
    return (
      <AuthCard title={t("takenTitle")} description={t("takenDescription")}>
        <div className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2.5 text-sm text-secondary-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {t("takenBody")}
        </div>
        <Button className="mt-4 w-full" render={<Link href="/login" />} nativeButton={false}>
          {t("goToSignIn")}
        </Button>
      </AuthCard>
    );
  }

  if (availability === "error") {
    return (
      <AuthCard title={t("dbErrorTitle")} description={t("dbErrorDescription")}>
        <p className="text-sm text-muted-foreground">
          {t("dbErrorBodyPrefix")} <code>MONGODB_URI</code> {t("dbErrorBodySuffix")}
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("title")} description={t("description")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="setup-name">{t("nameLabel")}</Label>
          <Input
            id="setup-name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="setup-email">{t("emailLabel")}</Label>
          <Input
            id="setup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="setup-password">{t("passwordLabel")}</Label>
          <Input
            id="setup-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
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
