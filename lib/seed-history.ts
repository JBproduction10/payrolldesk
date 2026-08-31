// lib/seed-history.ts
// No "use client" here on purpose — this is imported both by the client
// PayrollProvider (lib/store.tsx) and by server-only code (lib/db/workspace.ts)
// when seeding a brand-new account's workspace.

import type { Channel, LogEntry, Payslip, PayrollState } from "./types";
import { makePayslip } from "./payroll";
import { shiftPeriod, uid } from "./format";

/** Seeds a little payslip + activity history so charts and reports have something to show. */
export function seedHistory(state: PayrollState): PayrollState {
  const periods = [1, 2, 3, 4, 5].map((i) => shiftPeriod(state.period, -i));
  const payslips: Payslip[] = [];
  const logs: LogEntry[] = [];

  for (const period of periods) {
    for (const emp of state.employees) {
      if (emp.status === "inactive") continue;
      const fields = state.fields.filter((f) => f.clientId === emp.clientId);
      const ps = makePayslip(emp, fields, period);
      const sentAt = new Date(`${period}-28T09:15:00`).toISOString();
      for (const ch of Object.keys(ps.delivery) as Channel[]) {
        ps.delivery[ch] = { state: "sent", at: sentAt };
      }
      ps.status = "sent";
      ps.generatedAt = new Date(`${period}-27T08:00:00`).toISOString();
      payslips.push(ps);
    }
  }

  const now = Date.now();
  const activity: [number, LogEntry["kind"], string][] = [
    [2 * 3600e3, "generate", "Generated 9 payslips for Groupe Scolaire Les Cèdres"],
    [5 * 3600e3, "employee", "Added employee Paul Mvondo to Personnel d'appui"],
    [26 * 3600e3, "department", "Updated department head for Administration"],
    [30 * 3600e3, "send", "Delivered 5 payslips to Enseignants via email"],
    [50 * 3600e3, "employee", "Marked Roger Ondoa as on leave"],
    [74 * 3600e3, "field", "Added Prime de logement field (Enseignants only)"],
  ];
  for (const [ago, kind, message] of activity) {
    logs.push({
      id: uid("log"),
      clientId: "c_cedres",
      at: new Date(now - ago).toISOString(),
      kind,
      message,
    });
  }

  return { ...state, payslips, logs };
}
