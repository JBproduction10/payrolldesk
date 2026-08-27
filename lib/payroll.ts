// lib/payroll.ts

import type {
  Employee,
  PayField,
  Payslip,
  PayslipLine,
  Channel,
} from "./types";
import { uid } from "./format";

/** Does this field apply to this employee? */
export function fieldApplies(field: PayField, employee: Employee): boolean {
  if (field.departmentIds.length === 0) return true;
  return field.departmentIds.includes(employee.departmentId);
}

export function fieldsFor(fields: PayField[], employee: Employee): PayField[] {
  return fields
    .filter((f) => fieldApplies(f, employee))
    .sort((a, b) => a.order - b.order);
}

export interface Computed {
  lines: PayslipLine[];
  earnings: PayslipLine[];
  deductions: PayslipLine[];
  info: PayslipLine[];
  gross: number;
  totalDeductions: number;
  net: number;
}

/**
 * Earnings percentages are taken on base salary.
 * Deduction percentages are taken on gross pay.
 */
export function computePayslip(
  employee: Employee,
  allFields: PayField[],
): Computed {
  const applicable = fieldsFor(allFields, employee);
  const base = employee.baseSalary;

  const earnings: PayslipLine[] = [];
  const deductions: PayslipLine[] = [];
  const info: PayslipLine[] = [];

  for (const f of applicable) {
    if (f.category === "info") {
      const override = employee.values[f.id];
      info.push({
        fieldId: f.id,
        label: f.label,
        category: "info",
        amount: 0,
        display: "",
        text: (override as string) || f.textValue || "—",
      });
      continue;
    }

    if (f.category === "earning") {
      if (f.system) {
        earnings.push({
          fieldId: f.id,
          label: f.label,
          category: "earning",
          amount: base,
          display: "Base",
        });
        continue;
      }
      let amount = 0;
      let display = "";
      if (f.type === "fixed") {
        amount = f.amount;
        display = "Fixed";
      } else if (f.type === "percent") {
        amount = (base * f.amount) / 100;
        display = `${f.amount}% of base`;
      } else if (f.type === "perEmployee") {
        amount = Number(employee.values[f.id] ?? 0);
        display = "Per employee";
      }
      const override = employee.values[f.id];
      if (f.type !== "perEmployee" && override !== undefined && override !== "") {
        amount = Number(override);
        display = "Custom";
      }
      if (amount !== 0 || f.required) {
        earnings.push({
          fieldId: f.id,
          label: f.label,
          category: "earning",
          amount,
          display,
        });
      }
    }
  }

  const gross = earnings.reduce((s, l) => s + l.amount, 0);

  for (const f of applicable) {
    if (f.category !== "deduction") continue;
    let amount = 0;
    let display = "";
    if (f.type === "fixed") {
      amount = f.amount;
      display = "Fixed";
    } else if (f.type === "percent") {
      amount = (gross * f.amount) / 100;
      display = `${f.amount}% of gross`;
    } else if (f.type === "perEmployee") {
      amount = Number(employee.values[f.id] ?? 0);
      display = "Per employee";
    }
    const override = employee.values[f.id];
    if (f.type !== "perEmployee" && override !== undefined && override !== "") {
      amount = Number(override);
      display = "Custom";
    }
    if (amount !== 0 || f.required) {
      deductions.push({
        fieldId: f.id,
        label: f.label,
        category: "deduction",
        amount,
        display,
      });
    }
  }

  const totalDeductions = deductions.reduce((s, l) => s + l.amount, 0);

  return {
    lines: [...earnings, ...deductions, ...info],
    earnings,
    deductions,
    info,
    gross,
    totalDeductions,
    net: gross - totalDeductions,
  };
}

export function makePayslip(
  employee: Employee,
  fields: PayField[],
  period: string,
): Payslip {
  const c = computePayslip(employee, fields);
  const delivery: Payslip["delivery"] = {};
  for (const ch of employee.channels) {
    delivery[ch] = { state: "pending", at: null };
  }
  return {
    id: uid("ps"),
    clientId: employee.clientId,
    employeeId: employee.id,
    period,
    lines: c.lines,
    gross: c.gross,
    totalDeductions: c.totalDeductions,
    net: c.net,
    status: "draft",
    generatedAt: new Date().toISOString(),
    delivery,
  };
}

export function payslipStatus(p: Payslip): Payslip["status"] {
  const records = Object.values(p.delivery);
  if (records.length === 0) return "draft";
  const sent = records.filter((r) => r.state === "sent").length;
  const failed = records.filter((r) => r.state === "failed").length;
  if (sent === records.length) return "sent";
  if (failed > 0 && sent + failed === records.length)
    return sent > 0 ? "partial" : "failed";
  if (sent > 0) return "partial";
  return "draft";
}

/** Monthly cost of an employee to the client (gross). */
export function grossFor(employee: Employee, fields: PayField[]): number {
  return computePayslip(employee, fields).gross;
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
};

/* ---------------- Template rendering ---------------- */

export interface TokenContext {
  first_name: string;
  full_name: string;
  client: string;
  period: string;
  net_pay: string;
  gross_pay: string;
  pay_date: string;
  department: string;
  position: string;
}

export const TOKEN_LIST: { token: string; description: string }[] = [
  { token: "{{first_name}}", description: "Employee first name" },
  { token: "{{full_name}}", description: "Employee full name" },
  { token: "{{client}}", description: "Client organisation name" },
  { token: "{{period}}", description: "Pay period, e.g. August 2026" },
  { token: "{{net_pay}}", description: "Net payable amount" },
  { token: "{{gross_pay}}", description: "Gross pay before deductions" },
  { token: "{{pay_date}}", description: "Date wages land" },
  { token: "{{department}}", description: "Employee department" },
  { token: "{{position}}", description: "Job title" },
];

export function renderTemplate(tpl: string, ctx: TokenContext): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = (ctx as unknown as Record<string, string>)[key];
    return value !== undefined ? value : `{{${key}}}`;
  });
}
