"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MANAGE_NAV, PAYROLL_NAV, type NavItem } from "./nav-config";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function MobileNav({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => onOpenChange(false)}
        className={cn(
          "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-foreground/80 hover:bg-muted",
        )}
      >
        <Icon className="size-4 shrink-0" />
        {t(item.labelKey)}
      </Link>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border px-5 py-5">
          <SheetTitle className="flex items-center gap-2.5 text-base">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ReceiptText className="size-4.5" />
            </span>
            Payroll Desk
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-6 px-3 py-4">
          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t("manageSection")}
            </div>
            <div className="flex flex-col gap-0.5">{MANAGE_NAV.map(renderItem)}</div>
          </div>
          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t("payrollSection")}
            </div>
            <div className="flex flex-col gap-0.5">{PAYROLL_NAV.map(renderItem)}</div>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
