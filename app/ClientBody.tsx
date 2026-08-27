"use client";

import { useEffect } from "react";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/toast";

export default function ClientBody({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  // Remove any extension-added classes during hydration
  useEffect(() => {
    // This runs only on the client after hydration
    document.body.className = "antialiased";
  }, []);

  return (
    <div className="antialiased">
      <SessionProvider session={session}>
        {children}
        <Toaster />
      </SessionProvider>
    </div>
  );
}
