"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Check, ArrowLeftCircle, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { enterImpersonation, exitImpersonation } from "@/lib/use-impersonation";
import type { Organization } from "@/lib/types";

/**
 * Only rendered when session.user.impersonatorId is set — i.e. a
 * platform_admin is currently viewing this promoter's workspace. Ordinary
 * promoter accounts never see this.
 */
export function PromoterSwitcher({ activeOwnerId }: { activeOwnerId: string }) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/platform/organizations", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setOrganizations(data.organizations ?? []))
      .catch(() => setOrganizations([]));
  }, []);

  const activeOrg = organizations?.find((o) => o.ownerId === activeOwnerId) ?? null;

  async function switchTo(org: Organization) {
    if (busy) return;
    setBusy(true);
    const error = await enterImpersonation(org.id);
    if (error) {
      toast.add({ title: error, type: "error" });
      setBusy(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleExit() {
    if (busy) return;
    setBusy(true);
    const error = await exitImpersonation();
    if (error) {
      toast.add({ title: error, type: "error" });
      setBusy(false);
      return;
    }
    router.push("/promoters");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 outline-none hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        <Building2 className="size-3.5" />
        <span className="hidden sm:inline">{activeOrg?.name ?? "Viewing as promoter"}</span>
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
              disabled={busy}
              onClick={() => switchTo(org)}
              className="justify-between gap-2"
            >
              <span className="truncate">{org.name}</span>
              {org.id === activeOrg?.id && <Check className="size-4 shrink-0 text-primary" />}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/promoters" />} className="gap-2.5">
          <Settings className="size-4" />
          Manage promoters
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExit} disabled={busy} className="gap-2.5">
          <ArrowLeftCircle className="size-4" />
          Exit to platform admin
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
