"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AddFirstSchoolPrompt() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background px-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <Building2 className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">Add your first school</h1>
          <p className="text-sm text-muted-foreground">
            This promoter doesn't have any schools yet. Add one to start entering employees,
            students, and payroll.
          </p>
        </div>
        <Button render={<Link href="/clients">Add a school</Link>} />
      </div>
    </div>
  );
}
