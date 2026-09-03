"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { usePayroll } from "@/lib/store";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { AddFirstSchoolPrompt } from "./add-first-school-prompt";

// Pages that must stay reachable even with zero schools — otherwise there'd
// be no way to add the first one, or to switch to a different promoter.
const EMPTY_STATE_ALLOWED_PATHS = ["/clients", "/promoters"];

export function AppShell({ children }: { children: ReactNode }) {
  const { hydrated, clients } = usePayroll();
  const pathname = usePathname();
  const isAllowedWhileEmpty = EMPTY_STATE_ALLOWED_PATHS.some((p) => pathname?.startsWith(p));

  // A freshly-created organization has no schools yet — every other page
  // (and the Sidebar/Topbar themselves, via ClientSwitcher) assume an
  // active school exists, so show a dedicated prompt instead of the normal
  // shell until the first one is added.
  if (hydrated && clients.length === 0 && !isAllowedWhileEmpty) {
    return <AddFirstSchoolPrompt />;
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background print:h-auto print:overflow-visible">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin print:overflow-visible">
          <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:p-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
