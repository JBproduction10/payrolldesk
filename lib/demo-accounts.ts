// lib/demo-accounts.ts
//
// Single source of truth for the demo login accounts. Kept free of any
// server-only imports (bcrypt, mongodb) so it can be imported directly by
// the login page (a client component) as well as by lib/db/seed-users.ts.

import type { Role } from "./types";

export const DEMO_PASSWORD = "Demo123!";

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  clientId: string | null;
  employeeId: string | null;
  /** Short line shown under the name on the login page's quick-login list. */
  blurb: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "u_demo_admin",
    name: "Demo Administrator",
    email: "admin@payrolldesk.demo",
    role: "super_admin",
    clientId: null,
    employeeId: null,
    blurb: "Full platform access, every client",
  },
  {
    id: "u_demo_promoter",
    name: "Demo School Promoter",
    email: "promoter@payrolldesk.demo",
    role: "promoter",
    clientId: null,
    employeeId: null,
    blurb: "Org-wide strategic view",
  },
  {
    id: "u_demo_school_admin",
    name: "Sunrise School Admin",
    email: "admin.sunrise@payrolldesk.demo",
    role: "school_admin",
    clientId: "c_sunrise",
    employeeId: null,
    blurb: "Sunrise Academy — read-only + requisitions",
  },
  {
    id: "u_demo_finance",
    name: "Sunrise Finance Officer",
    email: "finance.sunrise@payrolldesk.demo",
    role: "finance",
    clientId: "c_sunrise",
    employeeId: null,
    blurb: "Sunrise Academy — financial reporting",
  },
  {
    // Bonté Service — org-wide, not scoped to any one school. Validates
    // and pays out the fund/payroll requisitions schools submit.
    id: "u_demo_treasury",
    name: "Bonté Service Treasury",
    email: "treasury@payrolldesk.demo",
    role: "treasury",
    clientId: null,
    employeeId: null,
    blurb: "Org-wide — requisitions & deliveries",
  },
  {
    // Caisse — the only role that enrolls students and updates fee
    // status on collection.
    id: "u_demo_cashier",
    name: "Sunrise Cashier",
    email: "cashier.sunrise@payrolldesk.demo",
    role: "cashier",
    clientId: "c_sunrise",
    employeeId: null,
    blurb: "Sunrise Academy — enroll students, collect fees",
  },
  {
    // Intendance & Logistique — supplies/uniforms stock for one school.
    id: "u_demo_intendance",
    name: "Sunrise Intendance",
    email: "intendance.sunrise@payrolldesk.demo",
    role: "intendance",
    clientId: "c_sunrise",
    employeeId: null,
    blurb: "Sunrise Academy — supplies & logistics",
  },
  {
    id: "u_demo_teacher",
    name: "Samuel Osei",
    email: "teacher.sunrise@payrolldesk.demo",
    role: "teacher",
    clientId: "c_sunrise",
    // Matches the seeded Sunrise Academy employee in lib/seed.ts.
    employeeId: "e_sunrise_teaching_1",
    blurb: "Sunrise Academy — own payslips",
  },
];
