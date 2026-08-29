"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Search, Menu, RotateCcw, LogOut } from "lucide-react";
import { usePayroll } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientSwitcher } from "./client-switcher";
import { MobileNav } from "./mobile-nav";
import { LanguageSwitcher } from "./language-switcher";
import { NotificationBell } from "./notification-bell";

export function Topbar() {
  const t = useTranslations("topbar");
  const { clientEmployees, clientDepartments, resetDemo } = usePayroll();
  const { data: session } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userName = session?.user?.name ?? "Admin";
  const userEmail = session?.user?.email ?? "";
  const userInitials = userName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { employees: [], departments: [] };
    return {
      employees: clientEmployees
        .filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.position.toLowerCase().includes(q) ||
            e.email.toLowerCase().includes(q),
        )
        .slice(0, 5),
      departments: clientDepartments
        .filter((d) => d.name.toLowerCase().includes(q))
        .slice(0, 4),
    };
  }, [query, clientEmployees, clientDepartments]);

  const hasResults = results.employees.length > 0 || results.departments.length > 0;

  return (
    <header className="flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6 print:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="size-5" />
      </Button>
      <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />

      <ClientSwitcher />

      <div className="relative ml-auto w-full max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={t("searchPlaceholder")}
          className="h-10 rounded-xl bg-muted pl-9"
        />
        {open && query.trim() && (
          <div className="absolute top-full left-0 z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
            {hasResults ? (
              <div className="max-h-72 overflow-y-auto p-1.5">
                {results.employees.length > 0 && (
                  <div className="px-2 pt-1 pb-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("employees")}
                  </div>
                )}
                {results.employees.map((e) => (
                  <button
                    key={e.id}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onMouseDown={() => {
                      setQuery("");
                      router.push("/employees");
                    }}
                  >
                    <span className="font-medium text-foreground">{e.name}</span>
                    <span className="text-xs text-muted-foreground">{e.position}</span>
                  </button>
                ))}
                {results.departments.length > 0 && (
                  <div className="px-2 pt-2 pb-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("departments")}
                  </div>
                )}
                {results.departments.map((d) => (
                  <button
                    key={d.id}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onMouseDown={() => {
                      setQuery("");
                      router.push("/departments");
                    }}
                  >
                    <span className="font-medium text-foreground">{d.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                {t("noMatches", { query })}
              </div>
            )}
          </div>
        )}
      </div>

      <LanguageSwitcher />

      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-olive text-sm font-semibold text-white outline-none">
          {userInitials || "AK"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <div className="text-sm font-medium text-foreground">{userName}</div>
            {userEmail && (
              <div className="text-xs text-muted-foreground">{userEmail}</div>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/clients" />} nativeButton={false}>
            {t("manageClients")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              resetDemo();
            }}
          >
            <RotateCcw className="size-4" />
            {t("resetDemoData")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="size-4" />
            {t("signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
