"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, ArrowLeftCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { exitImpersonation } from "@/lib/use-impersonation";

export function PlatformHeader({
  impersonatorName,
  viewingOrgName,
}: {
  impersonatorName: string | null;
  viewingOrgName: string | null;
}) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);
  const isImpersonating = !!impersonatorName;

  async function handleExit() {
    setExiting(true);
    const error = await exitImpersonation();
    if (error) {
      toast.add({ title: error, type: "error" });
      setExiting(false);
      return;
    }
    router.push("/promoters");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b bg-background px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold">Payroll Desk — Platform Admin</h1>
        {isImpersonating && (
          <p className="text-xs text-muted-foreground">
            Viewing as {viewingOrgName} — signed in via {impersonatorName}
          </p>
        )}
      </div>
      {isImpersonating ? (
        <Button variant="outline" size="sm" onClick={handleExit} disabled={exiting}>
          <ArrowLeftCircle className="size-4" />
          {exiting ? "Returning…" : "Exit to platform admin"}
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut className="size-4" />
          Sign out
        </Button>
      )}
    </header>
  );
}
