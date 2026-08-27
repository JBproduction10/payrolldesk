"use client";

import { ReceiptText, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

const ROLE_LABEL: Record<string, string> = {
  promoter: "Promoter",
  school_admin: "School Admin",
  teacher: "Teacher",
  finance: "Finance",
};

export function PortalTopbar() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  return (
    <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-6 print:hidden">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ReceiptText className="size-4.5" />
        </span>
        <span className="font-heading text-base font-semibold text-foreground">
          Payroll Desk
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {role && (
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            {ROLE_LABEL[role] ?? role}
          </span>
        )}
        <div className="hidden text-right leading-tight sm:block">
          <div className="text-sm font-medium text-foreground">
            {session?.user?.name}
          </div>
          <div className="text-xs text-muted-foreground">{session?.user?.email}</div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/" })}
          aria-label="Sign out"
        >
          <LogOut className="size-4.5" />
        </Button>
      </div>
    </header>
  );
}
