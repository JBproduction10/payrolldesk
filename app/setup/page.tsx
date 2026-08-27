"use client";

import { useEffect, useState, type FormEvent } from "react";
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
        setError(data.error || "Could not create your account.");
        setLoading(false);
        return;
      }
      const signInRes = await signIn("credentials", { email, password, redirect: false });
      if (signInRes?.error) {
        setError("Account created — please sign in.");
        setLoading(false);
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (availability === "checking") {
    return (
      <AuthCard title="Checking…" description="One moment.">
        <div className="flex justify-center py-4 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      </AuthCard>
    );
  }

  if (availability === "taken") {
    return (
      <AuthCard
        title="Already set up"
        description="This workspace already has an administrator."
      >
        <div className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2.5 text-sm text-secondary-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          Ask your administrator to add you from the Team & Access page — you'll get
          an email invite to set your own password.
        </div>
        <Button className="mt-4 w-full" render={<Link href="/login" />} nativeButton={false}>
          Go to sign in
        </Button>
      </AuthCard>
    );
  }

  if (availability === "error") {
    return (
      <AuthCard title="Can't reach the database" description="Please try again shortly.">
        <p className="text-sm text-muted-foreground">
          Make sure <code>MONGODB_URI</code> is configured, then reload this page.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set up your workspace"
      description="Create the first administrator account — this only works once."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="setup-name">Full name</Label>
          <Input
            id="setup-name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Amara Okafor"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="setup-email">Email</Label>
          <Input
            id="setup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="setup-password">Password</Label>
          <Input
            id="setup-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        <Button type="submit" className="mt-2" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Create workspace
        </Button>
      </form>
    </AuthCard>
  );
}
