"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
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
      <AuthCard
        title="Check your email"
        description="If an account exists for that address, we've sent password reset instructions."
      >
        <div className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2.5 text-sm text-secondary-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          The reset link is valid for 7 days. If it doesn't arrive, check your spam
          folder or ask your administrator to resend your invite instead.
        </div>
        <Button className="mt-4 w-full" render={<Link href="/login" />} nativeButton={false}>
          Back to sign in
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email and we'll send you a link to reset it."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fp-email">Email</Label>
          <Input
            id="fp-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>

        <Button type="submit" className="mt-2" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}
