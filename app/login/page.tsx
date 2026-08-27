"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingDemo, setPendingDemo] = useState<string | null>(null);

  async function doSignIn(signInEmail: string, signInPassword: string) {
    setError(null);
    try {
      const res = await signIn("credentials", {
        email: signInEmail,
        password: signInPassword,
        redirect: false,
      });
      if (res?.error) {
        setError("Incorrect email or password.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await doSignIn(email, password);
    setLoading(false);
  }

  async function handleDemoLogin(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setPendingDemo(demoEmail);
    await doSignIn(demoEmail, DEMO_PASSWORD);
    setPendingDemo(null);
  }

  return (
    <AuthCard
      title="Sign in"
      description="Welcome back — sign in to your payroll workspace."
      footer="Don't have access yet? Ask your administrator to add you — you'll get an email invite."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" className="mt-2" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <div className="mt-6 border-t border-border pt-5">
        <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Or try a demo account
        </p>
        <div className="flex flex-col gap-1.5">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => handleDemoLogin(account.email)}
              disabled={pendingDemo !== null}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-60"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{account.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{account.blurb}</span>
              </span>
              {pendingDemo === account.email && (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
