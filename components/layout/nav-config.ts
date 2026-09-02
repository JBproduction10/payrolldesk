import type { LucideIcon } from "lucide-react";
import {
  Gauge,
  Users,
  Building2,
  Landmark,
  ReceiptText,
  Send,
  SlidersHorizontal,
  GraduationCap,
  Wallet,
  UserCog,
  History,
  Mail,
  Network,
} from "lucide-react";

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

// labelKey values map to the "nav" namespace in messages/*.json
export const MANAGE_NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: Gauge },
  { href: "/employees", labelKey: "employees", icon: Users },
  { href: "/departments", labelKey: "departments", icon: Building2 },
  { href: "/clients", labelKey: "clients", icon: Landmark },
  { href: "/students", labelKey: "students", icon: GraduationCap },
  { href: "/expenses", labelKey: "expenses", icon: Wallet },
];

export const PAYROLL_NAV: NavItem[] = [
  { href: "/payslips", labelKey: "payslips", icon: ReceiptText },
  { href: "/send-payslips", labelKey: "sendPayslips", icon: Send },
  { href: "/field-designer", labelKey: "fieldDesigner", icon: SlidersHorizontal },
  { href: "/team", labelKey: "teamAccess", icon: UserCog },
  { href: "/promoters", labelKey: "promoters", icon: Network },
  { href: "/audit", labelKey: "auditLog", icon: History },
  { href: "/settings/email", labelKey: "emailSettings", icon: Mail },
];
