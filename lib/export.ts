// lib/export.ts
//
// "Download everything" — a safety net that doesn't depend on us or on the
// database staying reachable. Produces the same data the app already
// stores, in two forms:
//   - workspace.json: the exact PayrollState, good for restoring into
//     another PayrollDesk instance or for a developer to inspect.
//   - one CSV per table: good for opening straight in Excel/Sheets without
//     any tooling, which is what most people actually want from a backup.

import type { PayrollState } from "./types";

export interface TeamMemberExport {
  name: string;
  email: string;
  role: string;
  clientId: string | null;
  employeeId: string | null;
  createdAt: string;
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  // Quote whenever the field contains anything that would otherwise break
  // column alignment; doubling embedded quotes is the standard CSV escape.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","));
  }
  return lines.join("\r\n");
}

/** Builds every file that goes into the backup zip, keyed by in-archive filename. */
export function buildBackupFiles(
  state: PayrollState,
  team: TeamMemberExport[],
): { name: string; content: string }[] {
  const clientName = new Map(state.clients.map((c) => [c.id, c.name]));

  const files: { name: string; content: string }[] = [];

  files.push({ name: "workspace.json", content: JSON.stringify(state, null, 2) });

  files.push({
    name: "clients.csv",
    content: toCsv(
      state.clients.map((c) => ({
        id: c.id,
        name: c.name,
        domain: c.domain,
        description: c.description,
        currency: c.currency,
        payDay: c.payDay,
        createdAt: c.createdAt,
        deletedAt: c.deletedAt ?? "",
      })),
    ),
  });

  files.push({
    name: "departments.csv",
    content: toCsv(
      state.departments.map((d) => ({
        id: d.id,
        client: clientName.get(d.clientId) ?? d.clientId,
        name: d.name,
        headId: d.headId ?? "",
      })),
    ),
  });

  files.push({
    name: "employees.csv",
    content: toCsv(
      state.employees.map((e) => ({
        id: e.id,
        client: clientName.get(e.clientId) ?? e.clientId,
        name: e.name,
        email: e.email,
        phone: e.phone,
        position: e.position,
        departmentId: e.departmentId,
        baseSalary: e.baseSalary,
        status: e.status,
        joinDate: e.joinDate,
        deletedAt: e.deletedAt ?? "",
      })),
    ),
  });

  files.push({
    name: "students.csv",
    content: toCsv(
      state.students.map((s) => ({
        id: s.id,
        client: clientName.get(s.clientId) ?? s.clientId,
        name: s.name,
        className: s.className,
        guardianContact: s.guardianContact,
        monthlyFee: s.monthlyFee,
        status: s.status,
        joinDate: s.joinDate,
        note: s.note,
        deletedAt: s.deletedAt ?? "",
      })),
    ),
  });

  const employeeName = new Map(state.employees.map((e) => [e.id, e.name]));
  files.push({
    name: "payslips.csv",
    content: toCsv(
      state.payslips.map((p) => ({
        id: p.id,
        client: clientName.get(p.clientId) ?? p.clientId,
        employee: employeeName.get(p.employeeId) ?? p.employeeId,
        period: p.period,
        gross: p.gross,
        totalDeductions: p.totalDeductions,
        net: p.net,
        status: p.status,
        generatedAt: p.generatedAt,
      })),
    ),
  });

  const studentName = new Map(state.students.map((s) => [s.id, s.name]));
  files.push({
    name: "fee-payments.csv",
    content: toCsv(
      state.feePayments.map((p) => ({
        id: p.id,
        client: clientName.get(p.clientId) ?? p.clientId,
        student: studentName.get(p.studentId) ?? p.studentId,
        period: p.period,
        amountDue: p.amountDue,
        amountPaid: p.amountPaid,
        status: p.status,
        paidAt: p.paidAt ?? "",
        note: p.note,
      })),
    ),
  });

  files.push({
    name: "expenses.csv",
    content: toCsv(
      state.expenses.map((e) => ({
        id: e.id,
        client: clientName.get(e.clientId) ?? e.clientId,
        category: e.category,
        description: e.description,
        amount: e.amount,
        date: e.date,
        submittedBy: e.submittedBy,
        createdAt: e.createdAt,
      })),
    ),
  });

  files.push({
    name: "team.csv",
    content: toCsv(
      team.map((t) => ({
        name: t.name,
        email: t.email,
        role: t.role,
        client: t.clientId ? (clientName.get(t.clientId) ?? t.clientId) : "",
        createdAt: t.createdAt,
      })),
    ),
  });

  files.push({
    name: "audit-log.csv",
    content: toCsv(
      state.logs.map((l) => ({
        at: l.at,
        client: clientName.get(l.clientId) ?? l.clientId,
        kind: l.kind,
        message: l.message,
        actor: l.actor?.name ?? "",
        actorRole: l.actor?.role ?? "",
        sensitive: l.sensitive ? "yes" : "",
      })),
    ),
  });

  return files;
}
