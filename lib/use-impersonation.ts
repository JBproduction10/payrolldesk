"use client";

import { signIn } from "next-auth/react";

export async function enterImpersonation(organizationId: string): Promise<string | null> {
  const res = await fetch(`/api/platform/organizations/${organizationId}/impersonate`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) {
    return data.error || "Could not switch to that organization.";
  }
  await signIn("impersonate", { token: data.token, redirect: false });
  return null;
}

export async function exitImpersonation(): Promise<string | null> {
  const res = await fetch("/api/platform/exit-impersonation", { method: "POST" });
  const data = await res.json();
  if (!res.ok) {
    return data.error || "Could not return to the platform admin account.";
  }
  await signIn("impersonate", { token: data.token, redirect: false });
  return null;
}
