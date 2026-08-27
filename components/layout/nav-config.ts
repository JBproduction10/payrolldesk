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
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const MANAGE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/clients", label: "Clients", icon: Landmark },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/expenses", label: "Expenses", icon: Wallet },
];

export const PAYROLL_NAV: NavItem[] = [
  { href: "/payslips", label: "Payslips", icon: ReceiptText },
  { href: "/send-payslips", label: "Send Payslips", icon: Send },
  { href: "/field-designer", label: "Field Designer", icon: SlidersHorizontal },
  { href: "/team", label: "Team & Access", icon: UserCog },
  { href: "/audit", label: "Audit Log", icon: History },
  { href: "/settings/email", label: "Email Settings", icon: Mail },
];
