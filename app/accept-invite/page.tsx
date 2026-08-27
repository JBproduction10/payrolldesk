"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super admin",
  promoter: "Promoter",
  school_admin: "School admin",
  teacher: "Teacher",
  finance: "Finance staff",
};

function AcceptInviteForm() {
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
      setCheckError("Missing invite link.");
      setChecking(false);
      return;
    }
    fetch(`/api/auth/accept-invite?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setCheckError(data.error || "This invite link is invalid or has expired.");
          return;
        }
        setInvite(data);
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
        setError(data.error || "Could not set your password.");
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
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <AuthCard title="Checking your invite…" description="One moment.">
        <div className="flex justify-center py-4 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      </AuthCard>
    );
  }

  if (checkError || !invite) {
    return (
      <AuthCard title="Invite not found" description={checkError ?? "This link isn't valid."}>
        <Button className="w-full" onClick={() => router.push("/login")}>
          Go to sign in
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set your password"
      description={`Welcome, ${invite.name} — you've been added as ${ROLE_LABEL[invite.role] ?? invite.role}.`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>Email</Label>
          <Input value={invite.email} disabled />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ai-password">Password</Label>
          <Input
            id="ai-password"
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
          <Label htmlFor="ai-confirm">Confirm password</Label>
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
          Set password & sign in
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
