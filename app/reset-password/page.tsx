"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordForm() {
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
      setCheckError("Missing reset link.");
      setChecking(false);
      return;
    }
    // Reuses the invite-token validation endpoint — the token mechanism is
    // identical whether it came from an invite or a password-reset request.
    fetch(`/api/auth/accept-invite?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setCheckError(data.error || "This reset link is invalid or has expired.");
          return;
        }
        setAccount(data);
      })
      .catch(() => setCheckError("Couldn't reach the server."))
      .finally(() => setChecking(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
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
        setError(data.error || "Could not reset your password.");
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
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <AuthCard title="Checking your link…" description="One moment.">
        <div className="flex justify-center py-4 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      </AuthCard>
    );
  }

  if (checkError || !account) {
    return (
      <AuthCard
        title="Reset link not valid"
        description={checkError ?? "This link isn't valid."}
      >
        <Button className="w-full" onClick={() => router.push("/forgot-password")}>
          Request a new link
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset your password" description={`For ${account.email}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rp-password">New password</Label>
          <Input
            id="rp-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rp-confirm">Confirm new password</Label>
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
          Reset password & sign in
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
