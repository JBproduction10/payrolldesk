"use client";

import type { ReactNode } from "react";
import { PayrollProvider } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";

export function PayrollShell({ children }: { children: ReactNode }) {
  return (
    <PayrollProvider>
      <AppShell>{children}</AppShell>
    </PayrollProvider>
  );
}
