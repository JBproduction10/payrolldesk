"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ChevronDown, Check, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import type { Organization } from "@/lib/types";

/** Only rendered for role === "super_admin" — the platform owner, who can view any promoter's workspace. */
export function OrgSwitcher() {
  const [organizations, setOrganizations] = useState<Organization[] | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/organizations", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/active-org", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([orgsData, activeData]) => {
        setOrganizations(orgsData.organizations ?? []);
        setActiveOrgId(activeData.organization?.id ?? null);
      })
      .catch(() => setOrganizations([]));
  }, []);

  const activeOrg = organizations?.find((o) => o.id === activeOrgId) ?? null;

  async function switchTo(org: Organization) {
    if (busy || org.id === activeOrgId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/active-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: org.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.add({ title: data.error || "Could not switch to that organization.", type: "error" });
        setBusy(false);
        return;
      }
      // A hard reload, not router.push — PayrollProvider only fetches
      // workspace state once, on sign-in, and lives in a layout that
      // persists across client-side navigation. Only a full reload
      // guarantees it re-fetches under the newly active organization.
      window.location.href = "/dashboard";
    } catch {
      toast.add({ title: "Could not reach the server.", type: "error" });
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground outline-none hover:bg-muted/70">
        <Building2 className="size-3.5" />
        <span className="hidden sm:inline">{activeOrg?.name ?? "Promoter"}</span>
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Switch promoter
        </DropdownMenuLabel>
        {organizations === null ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">Loading…</div>
        ) : organizations.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">No promoters yet.</div>
        ) : (
          organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              disabled={busy || org.status === "suspended"}
              onClick={() => switchTo(org)}
              className="justify-between gap-2"
            >
              <span className="truncate">
                {org.name}
                {org.status === "suspended" ? " (suspended)" : ""}
              </span>
              {org.id === activeOrgId && <Check className="size-4 shrink-0 text-primary" />}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/promoters" />} className="gap-2.5">
          <Settings className="size-4" />
          Manage promoters
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
