"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";
import { MANAGE_NAV, PAYROLL_NAV, type NavItem } from "./nav-config";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const t = useTranslations("nav");
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-foreground/80 hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {t(item.labelKey)}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations("nav");
  const userName = session?.user?.name ?? "Admin";
  const userEmail = session?.user?.email ?? "";
  const userInitials = userName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar lg:flex print:hidden">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ReceiptText className="size-4.5" />
        </div>
        <div className="leading-tight">
          <div className="font-heading text-base font-semibold text-foreground">
            Payroll Desk
          </div>
          <div className="text-xs text-muted-foreground">{t("payrollAdmin")}</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4 scrollbar-thin">
        <div>
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {t("manageSection")}
          </div>
          <div className="flex flex-col gap-0.5">
            {MANAGE_NAV.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {t("payrollSection")}
          </div>
          <div className="flex flex-col gap-0.5">
            {PAYROLL_NAV.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
              />
            ))}
          </div>
        </div>
      </nav>

      <div className="flex items-center gap-2.5 border-t border-border px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-full bg-brand-olive text-sm font-semibold text-white">
          {userInitials || "AK"}
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-medium text-foreground">
            {userName}
          </div>
          <div className="truncate text-xs text-muted-foreground">{userEmail}</div>
        </div>
      </div>
    </aside>
  );
}
