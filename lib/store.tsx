"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import type {
  Channel,
  Client,
  DeliveryState,
  Department,
  Employee,
  Expense,
  FeePayment,
  FeeStatus,
  ID,
  LogActor,
  LogEntry,
  PayField,
  Payslip,
  PayrollState,
  Requisition,
  Student,
  Templates,
} from "./types";
import { buildInitialState } from "./seed";
import { seedHistory } from "./seed-history";
import { makePayslip, payslipStatus } from "./payroll";
import { shiftPeriod, uid } from "./format";

const STATE_ENDPOINT = "/api/state";

interface PayrollContextValue extends PayrollState {
  hydrated: boolean;
  synced: boolean;
  activeClient: Client;
  clientDepartments: Department[];
  clientEmployees: Employee[];
  clientFields: PayField[];
  clientPayslips: Payslip[];
  periodPayslips: Payslip[];
  clientLogs: LogEntry[];
  clientStudents: Student[];
  clientExpenses: Expense[];
  clientFeePayments: FeePayment[];
  clientRequisitions: Requisition[];
  /** Soft-deleted clients — not shown anywhere except the Trash view. */
  deletedClients: Client[];
  /** Soft-deleted employees for the active client. */
  deletedEmployees: Employee[];
  /** Soft-deleted students for the active client. */
  deletedStudents: Student[];
  /** Alias of deletedEmployees, for the Trash view. */
  clientDeletedEmployees: Employee[];
  /** Alias of deletedStudents, for the Trash view. */
  clientDeletedStudents: Student[];

  setActiveClient: (id: ID) => void;
  setPeriod: (period: string) => void;

  addClient: (c: Omit<Client, "id" | "createdAt">) => void;
  updateClient: (id: ID, patch: Partial<Client>) => void;
  removeClient: (id: ID) => void;
  restoreClient: (id: ID) => void;
  /** Permanently deletes a soft-deleted client and everything scoped to it. Can't be undone. */
  purgeClient: (id: ID) => void;

  addDepartment: (d: Omit<Department, "id" | "clientId">) => void;
  updateDepartment: (id: ID, patch: Partial<Department>) => void;
  removeDepartment: (id: ID) => void;

  addEmployee: (e: Omit<Employee, "id" | "clientId">) => void;
  addEmployeesBulk: (employees: Omit<Employee, "id" | "clientId">[]) => number;
  updateEmployee: (id: ID, patch: Partial<Employee>) => void;
  removeEmployee: (id: ID) => void;
  restoreEmployee: (id: ID) => void;
  /** Permanently deletes a soft-deleted employee. Can't be undone. */
  purgeEmployee: (id: ID) => void;

  addField: (f: Omit<PayField, "id" | "clientId" | "order">) => void;
  updateField: (id: ID, patch: Partial<PayField>) => void;
  removeField: (id: ID) => void;
  moveField: (id: ID, direction: -1 | 1) => void;

  generatePayslips: (period: string, departmentIds?: ID[]) => number;
  clearPayslips: (period: string) => void;
  setDelivery: (
    payslipId: ID,
    channel: Channel,
    state: DeliveryState,
    error?: string,
  ) => void;
  markAllSent: (period: string) => void;

  updateTemplates: (patch: Partial<Templates>) => void;
  log: (kind: LogEntry["kind"], message: string, meta?: string) => void;
  resetDemo: () => void;

  addStudent: (s: Omit<Student, "id" | "clientId">) => void;
  addStudentsBulk: (students: Omit<Student, "id" | "clientId">[]) => number;
  updateStudent: (id: ID, patch: Partial<Student>) => void;
  removeStudent: (id: ID) => void;
  restoreStudent: (id: ID) => void;
  /** Permanently deletes a soft-deleted student and their payment history. Can't be undone. */
  purgeStudent: (id: ID) => void;
  recordPayment: (
    studentId: ID,
    period: string,
    amountPaid: number,
    status: FeeStatus,
    note?: string,
  ) => void;

  addExpense: (e: Omit<Expense, "id" | "clientId" | "createdAt">) => void;
  updateExpense: (id: ID, patch: Partial<Expense>) => void;
  removeExpense: (id: ID) => void;
}

const PayrollContext = createContext<PayrollContextValue | null>(null);

export function PayrollProvider({ children }: { children: React.ReactNode }) {
  const { data: sessionData, status } = useSession();
  const [state, setState] = useState<PayrollState>(() =>
    seedHistory(buildInitialState()),
  );
  const [hydrated, setHydrated] = useState(false);
  const [synced, setSynced] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);

  // Who's currently signed in — read by pushLog() so every audit entry can
  // say who did it. Kept in a ref (not state) so pushLog, which is memoized
  // once with an empty dep array, always sees the latest value.
  const actorRef = useRef<LogActor | null>(null);
  useEffect(() => {
    const user = sessionData?.user;
    actorRef.current =
      user?.id && user?.role
        ? { id: user.id, name: user.name || "Unknown user", role: user.role }
        : null;
  }, [sessionData]);

  // Load this account's workspace from MongoDB once signed in.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(STATE_ENDPOINT, { cache: "no-store" });
        if (!res.ok) throw new Error(`GET ${STATE_ENDPOINT} → ${res.status}`);
        const data = (await res.json()) as { state: PayrollState };
        if (!cancelled && data?.state?.clients?.length) {
          skipNextSave.current = true;
          setState(data.state);
        }
        if (!cancelled) setSynced(true);
      } catch (err) {
        console.error("Could not load workspace from the database:", err);
        if (!cancelled) setSynced(false);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  // Persist changes back to MongoDB, debounced so rapid interactions
  // (e.g. simulated bulk sends) collapse into a single request.
  useEffect(() => {
    if (!hydrated || status !== "authenticated") return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(STATE_ENDPOINT, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state }),
        });
        setSynced(res.ok);
      } catch (err) {
        console.error("Could not save workspace to the database:", err);
        setSynced(false);
      }
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, hydrated, status]);

  const patch = useCallback(
    (fn: (s: PayrollState) => PayrollState) => setState((s) => fn(s)),
    [],
  );

  const pushLog = useCallback(
    (
      s: PayrollState,
      kind: LogEntry["kind"],
      message: string,
      opts?: { meta?: string; sensitive?: boolean },
    ) => ({
      ...s,
      logs: [
        {
          id: uid("log"),
          clientId: s.activeClientId,
          at: new Date().toISOString(),
          kind,
          message,
          meta: opts?.meta,
          actor: actorRef.current,
          sensitive: opts?.sensitive,
        },
        ...s.logs,
        // Audit history is capped generously (well past the ~200 recent-activity
        // entries the dashboard feed shows) so "who deleted/changed what" stays
        // available for a good while rather than scrolling off after a busy day.
      ].slice(0, 1000),
    }),
    [],
  );

  /* ------------------------- derived ------------------------- */

  // Soft-deleted records are kept in the underlying arrays (so they can be
  // restored) but hidden from every normal list/selector below. Only the
  // *Deleted* selectors near the bottom of this block surface them, for the
  // Trash views.
  const activeClientsList = useMemo(
    () => state.clients.filter((c) => !c.deletedAt),
    [state.clients],
  );
  const activeEmployeesList = useMemo(
    () => state.employees.filter((e) => !e.deletedAt),
    [state.employees],
  );
  const activeStudentsList = useMemo(
    () => state.students.filter((s) => !s.deletedAt),
    [state.students],
  );

  const activeClient = useMemo(
    () =>
      activeClientsList.find((c) => c.id === state.activeClientId) ??
      activeClientsList[0] ??
      state.clients[0],
    [activeClientsList, state.clients, state.activeClientId],
  );

  const clientDepartments = useMemo(
    () => state.departments.filter((d) => d.clientId === state.activeClientId),
    [state.departments, state.activeClientId],
  );

  const clientEmployees = useMemo(
    () => activeEmployeesList.filter((e) => e.clientId === state.activeClientId),
    [activeEmployeesList, state.activeClientId],
  );

  const clientFields = useMemo(
    () =>
      state.fields
        .filter((f) => f.clientId === state.activeClientId)
        .sort((a, b) => a.order - b.order),
    [state.fields, state.activeClientId],
  );

  const clientPayslips = useMemo(
    () => state.payslips.filter((p) => p.clientId === state.activeClientId),
    [state.payslips, state.activeClientId],
  );

  const periodPayslips = useMemo(
    () => clientPayslips.filter((p) => p.period === state.period),
    [clientPayslips, state.period],
  );

  const clientLogs = useMemo(
    () => state.logs.filter((l) => l.clientId === state.activeClientId),
    [state.logs, state.activeClientId],
  );

  const clientStudents = useMemo(
    () => activeStudentsList.filter((s) => s.clientId === state.activeClientId),
    [activeStudentsList, state.activeClientId],
  );

  const clientExpenses = useMemo(
    () => state.expenses.filter((e) => e.clientId === state.activeClientId),
    [state.expenses, state.activeClientId],
  );

  const clientFeePayments = useMemo(
    () => state.feePayments.filter((p) => p.clientId === state.activeClientId),
    [state.feePayments, state.activeClientId],
  );

  const clientRequisitions = useMemo(
    () => state.requisitions.filter((r) => r.clientId === state.activeClientId),
    [state.requisitions, state.activeClientId],
  );

  const deletedClients = useMemo(
    () => state.clients.filter((c) => c.deletedAt),
    [state.clients],
  );
  const deletedEmployees = useMemo(
    () => state.employees.filter((e) => e.deletedAt && e.clientId === state.activeClientId),
    [state.employees, state.activeClientId],
  );
  const deletedStudents = useMemo(
    () => state.students.filter((s) => s.deletedAt && s.clientId === state.activeClientId),
    [state.students, state.activeClientId],
  );

  /* ------------------------- actions ------------------------- */

  const value: PayrollContextValue = {
    ...state,
    // Override the raw arrays from `state` with the soft-delete-filtered
    // versions — every consumer that destructures `clients` / `employees` /
    // `students` off the context (not just the client*-scoped selectors
    // above) should see active records only.
    clients: activeClientsList,
    employees: activeEmployeesList,
    students: activeStudentsList,
    hydrated,
    synced,
    activeClient,
    clientDepartments,
    clientEmployees,
    clientFields,
    clientPayslips,
    periodPayslips,
    clientLogs,
    clientStudents,
    clientExpenses,
    clientFeePayments,
    clientRequisitions,
    deletedClients,
    deletedEmployees,
    deletedStudents,
    clientDeletedEmployees: deletedEmployees,
    clientDeletedStudents: deletedStudents,

    setActiveClient: (id) => patch((s) => ({ ...s, activeClientId: id })),
    setPeriod: (period) => patch((s) => ({ ...s, period })),

    addClient: (c) =>
      patch((s) => {
        const id = uid("c");
        return pushLog(
          {
            ...s,
            clients: [
              ...s.clients,
              { ...c, id, createdAt: new Date().toISOString().slice(0, 10) },
            ],
            activeClientId: id,
            fields: [
              ...s.fields,
              {
                id: uid("f"),
                clientId: id,
                label: "Basic Salary",
                category: "earning",
                type: "perEmployee",
                amount: 0,
                textValue: "",
                required: true,
                departmentIds: [],
                order: 0,
                note: "Pulled from each employee record",
                system: true,
              },
            ],
          },
          "client",
          `Created client ${c.name}`,
        );
      }),

    updateClient: (id, p) =>
      patch((s) => {
        const before = s.clients.find((c) => c.id === id);
        const next = {
          ...s,
          clients: s.clients.map((c) => (c.id === id ? { ...c, ...p } : c)),
        };
        if (!before) return next;
        return pushLog(next, "client", `Updated client ${before.name}`);
      }),

    // Soft delete: the client and everything scoped to it (employees,
    // students, payslips, etc.) stays in the database untouched — it just
    // drops out of every list/dropdown until restored from the Trash view.
    removeClient: (id) =>
      patch((s) => {
        const remainingActive = s.clients.filter(
          (c) => c.id !== id && !c.deletedAt,
        );
        if (remainingActive.length === 0) return s;
        const target = s.clients.find((c) => c.id === id);
        return pushLog(
          {
            ...s,
            clients: s.clients.map((c) =>
              c.id === id ? { ...c, deletedAt: new Date().toISOString() } : c,
            ),
            activeClientId:
              s.activeClientId === id ? remainingActive[0].id : s.activeClientId,
          },
          "client",
          `Deleted client ${target?.name ?? ""}`,
          { sensitive: true },
        );
      }),

    restoreClient: (id) =>
      patch((s) => {
        const target = s.clients.find((c) => c.id === id);
        return pushLog(
          {
            ...s,
            clients: s.clients.map((c) => (c.id === id ? { ...c, deletedAt: null } : c)),
          },
          "client",
          `Restored client ${target?.name ?? ""}`,
        );
      }),

    purgeClient: (id) =>
      patch((s) => {
        const target = s.clients.find((c) => c.id === id);
        return pushLog(
          {
            ...s,
            clients: s.clients.filter((c) => c.id !== id),
            departments: s.departments.filter((d) => d.clientId !== id),
            employees: s.employees.filter((e) => e.clientId !== id),
            fields: s.fields.filter((f) => f.clientId !== id),
            payslips: s.payslips.filter((p) => p.clientId !== id),
            students: s.students.filter((st) => st.clientId !== id),
            feePayments: s.feePayments.filter((p) => p.clientId !== id),
            expenses: s.expenses.filter((e) => e.clientId !== id),
            requisitions: s.requisitions.filter((r) => r.clientId !== id),
            supplyDeliveries: s.supplyDeliveries.filter((d) => d.clientId !== id),
            supplySales: s.supplySales.filter((sl) => sl.clientId !== id),
            supplyInventoryCounts: s.supplyInventoryCounts.filter((c) => c.clientId !== id),
          },
          "client",
          `Permanently deleted client ${target?.name ?? ""}`,
          { sensitive: true },
        );
      }),

    addDepartment: (d) =>
      patch((s) =>
        pushLog(
          {
            ...s,
            departments: [
              ...s.departments,
              { ...d, id: uid("d"), clientId: s.activeClientId },
            ],
          },
          "department",
          `Created department ${d.name}`,
        ),
      ),

    updateDepartment: (id, p) =>
      patch((s) => ({
        ...s,
        departments: s.departments.map((d) =>
          d.id === id ? { ...d, ...p } : d,
        ),
      })),

    removeDepartment: (id) =>
      patch((s) => {
        const dept = s.departments.find((d) => d.id === id);
        return pushLog(
          {
            ...s,
            departments: s.departments.filter((d) => d.id !== id),
            // Soft-delete, not filter-out — keeps the "employees are never
            // hard-deleted" guarantee even when they're removed indirectly
            // via their department.
            employees: s.employees.map((e) =>
              e.departmentId === id
                ? { ...e, deletedAt: new Date().toISOString() }
                : e,
            ),
            fields: s.fields.map((f) => ({
              ...f,
              departmentIds: f.departmentIds.filter((x) => x !== id),
            })),
          },
          "department",
          `Removed department ${dept?.name ?? ""} and its staff`,
          { sensitive: true },
        );
      }),

    addEmployee: (e) =>
      patch((s) =>
        pushLog(
          {
            ...s,
            employees: [
              ...s.employees,
              { ...e, id: uid("e"), clientId: s.activeClientId },
            ],
          },
          "employee",
          `Added employee ${e.name}`,
        ),
      ),

    updateEmployee: (id, p) =>
      patch((s) => {
        const before = s.employees.find((e) => e.id === id);
        const next = {
          ...s,
          employees: s.employees.map((e) => (e.id === id ? { ...e, ...p } : e)),
        };
        if (!before) return next;
        // Compensation changes are the sensitive case worth calling out by
        // name; other edits (contact info, department, status) still log,
        // just without the "sensitive" flag.
        const salaryChanged =
          p.baseSalary !== undefined && p.baseSalary !== before.baseSalary;
        return pushLog(
          next,
          "employee",
          salaryChanged
            ? `Changed ${before.name}'s base salary from ${before.baseSalary} to ${p.baseSalary}`
            : `Updated ${before.name}`,
          { sensitive: salaryChanged },
        );
      }),

    addEmployeesBulk: (employees) => {
      if (employees.length === 0) return 0;
      patch((s) =>
        pushLog(
          {
            ...s,
            employees: [
              ...s.employees,
              ...employees.map((employee) => ({
                ...employee,
                id: uid("e"),
                clientId: s.activeClientId,
              })),
            ],
          },
          "employee",
          `Imported ${employees.length} employee${employees.length === 1 ? "" : "s"}`,
        ),
      );
      return employees.length;
    },

    // Soft delete — the record (and any payslips already generated for
    // them) stays intact so it can be restored from the Trash view.
    removeEmployee: (id) =>
      patch((s) => {
        const emp = s.employees.find((e) => e.id === id);
        return pushLog(
          {
            ...s,
            employees: s.employees.map((e) =>
              e.id === id ? { ...e, deletedAt: new Date().toISOString() } : e,
            ),
            departments: s.departments.map((d) =>
              d.headId === id ? { ...d, headId: null } : d,
            ),
          },
          "employee",
          `Removed ${emp?.name ?? "an employee"}`,
          { sensitive: true },
        );
      }),

    restoreEmployee: (id) =>
      patch((s) => {
        const emp = s.employees.find((e) => e.id === id);
        return pushLog(
          {
            ...s,
            employees: s.employees.map((e) =>
              e.id === id ? { ...e, deletedAt: null } : e,
            ),
          },
          "employee",
          `Restored ${emp?.name ?? "an employee"}`,
        );
      }),

    purgeEmployee: (id) =>
      patch((s) => {
        const emp = s.employees.find((e) => e.id === id);
        return pushLog(
          {
            ...s,
            employees: s.employees.filter((e) => e.id !== id),
          },
          "employee",
          `Permanently deleted ${emp?.name ?? "an employee"}`,
          { sensitive: true },
        );
      }),

    addField: (f) =>
      patch((s) => {
        const orders = s.fields
          .filter((x) => x.clientId === s.activeClientId)
          .map((x) => x.order);
        return pushLog(
          {
            ...s,
            fields: [
              ...s.fields,
              {
                ...f,
                id: uid("f"),
                clientId: s.activeClientId,
                order: Math.max(0, ...orders) + 1,
              },
            ],
          },
          "field",
          `Added ${f.category} field "${f.label}"`,
        );
      }),

    updateField: (id, p) =>
      patch((s) => {
        const before = s.fields.find((f) => f.id === id);
        const next = {
          ...s,
          fields: s.fields.map((f) => (f.id === id ? { ...f, ...p } : f)),
        };
        if (!before) return next;
        const amountChanged =
          p.amount !== undefined && p.amount !== before.amount;
        return pushLog(
          next,
          "field",
          amountChanged
            ? `Changed "${before.label}" amount from ${before.amount} to ${p.amount}`
            : `Updated field "${before.label}"`,
          { sensitive: amountChanged },
        );
      }),

    removeField: (id) =>
      patch((s) => {
        const f = s.fields.find((x) => x.id === id);
        if (f?.system) return s;
        return pushLog(
          { ...s, fields: s.fields.filter((x) => x.id !== id) },
          "field",
          `Removed field "${f?.label ?? ""}"`,
        );
      }),

    moveField: (id, direction) =>
      patch((s) => {
        const target = s.fields.find((f) => f.id === id);
        if (!target) return s;
        const siblings = s.fields
          .filter(
            (f) =>
              f.clientId === target.clientId && f.category === target.category,
          )
          .sort((a, b) => a.order - b.order);
        const idx = siblings.findIndex((f) => f.id === id);
        const swap = siblings[idx + direction];
        if (!swap) return s;
        return {
          ...s,
          fields: s.fields.map((f) => {
            if (f.id === target.id) return { ...f, order: swap.order };
            if (f.id === swap.id) return { ...f, order: target.order };
            return f;
          }),
        };
      }),

    generatePayslips: (period, departmentIds) => {
      let count = 0;
      patch((s) => {
        const fields = s.fields.filter((f) => f.clientId === s.activeClientId);
        const targets = s.employees.filter(
          (e) =>
            e.clientId === s.activeClientId &&
            e.status !== "inactive" &&
            (!departmentIds ||
              departmentIds.length === 0 ||
              departmentIds.includes(e.departmentId)),
        );
        count = targets.length;
        const targetIds = new Set(targets.map((t) => t.id));
        const kept = s.payslips.filter(
          (p) =>
            !(
              p.clientId === s.activeClientId &&
              p.period === period &&
              targetIds.has(p.employeeId)
            ),
        );
        const fresh = targets.map((e) => makePayslip(e, fields, period));
        return pushLog(
          { ...s, payslips: [...kept, ...fresh], period },
          "generate",
          `Generated ${count} payslip${count === 1 ? "" : "s"} for ${period}`,
        );
      });
      return count;
    },

    clearPayslips: (period) =>
      patch((s) => {
        const n = s.payslips.filter(
          (p) => p.clientId === s.activeClientId && p.period === period,
        ).length;
        return pushLog(
          {
            ...s,
            payslips: s.payslips.filter(
              (p) => !(p.clientId === s.activeClientId && p.period === period),
            ),
          },
          "generate",
          `Cleared ${n} payslip${n === 1 ? "" : "s"} for ${period}`,
          { sensitive: true },
        );
      }),

    setDelivery: (payslipId, channel, deliveryState, error) =>
      patch((s) => {
        const before = s.payslips.find((p) => p.id === payslipId);
        const payslips = s.payslips.map((p) => {
          if (p.id !== payslipId) return p;
          const next: Payslip = {
            ...p,
            delivery: {
              ...p.delivery,
              [channel]: {
                state: deliveryState,
                at:
                  deliveryState === "sent" || deliveryState === "failed"
                    ? new Date().toISOString()
                    : null,
                error,
              },
            },
          };
          return { ...next, status: payslipStatus(next) };
        });
        if (!before) return { ...s, payslips };
        const emp = s.employees.find((e) => e.id === before.employeeId);
        return pushLog(
          { ...s, payslips },
          deliveryState === "failed" ? "fail" : "send",
          `Marked ${emp?.name ?? "an employee"}'s ${before.period} payslip (${channel}) as ${deliveryState}${error ? `: ${error}` : ""}`,
          { sensitive: true },
        );
      }),

    markAllSent: (period) =>
      patch((s) => {
        let n = 0;
        const payslips = s.payslips.map((p) => {
          if (p.clientId !== s.activeClientId || p.period !== period) return p;
          n += 1;
          const delivery: Payslip["delivery"] = {};
          for (const ch of Object.keys(p.delivery) as Channel[]) {
            delivery[ch] = { state: "sent", at: new Date().toISOString() };
          }
          return { ...p, delivery, status: "sent" as const };
        });
        return pushLog({ ...s, payslips }, "send", `Marked ${n} payslips as delivered`, {
          sensitive: true,
        });
      }),

    updateTemplates: (p) =>
      patch((s) => ({ ...s, templates: { ...s.templates, ...p } })),

    log: (kind, message, meta) => patch((s) => pushLog(s, kind, message, { meta })),

    resetDemo: () => {
      const fresh = seedHistory(buildInitialState());
      skipNextSave.current = false;
      setState(fresh);
    },

    addStudent: (st) =>
      patch((s) =>
        pushLog(
          {
            ...s,
            students: [
              ...s.students,
              { ...st, id: uid("st"), clientId: s.activeClientId },
            ],
          },
          "student",
          `Added student ${st.name}`,
        ),
      ),

    updateStudent: (id, p) =>
      patch((s) => {
        const before = s.students.find((st) => st.id === id);
        const next = {
          ...s,
          students: s.students.map((st) => (st.id === id ? { ...st, ...p } : st)),
        };
        if (!before) return next;
        const feeChanged =
          p.monthlyFee !== undefined && p.monthlyFee !== before.monthlyFee;
        return pushLog(
          next,
          "student",
          feeChanged
            ? `Changed ${before.name}'s monthly fee from ${before.monthlyFee} to ${p.monthlyFee}`
            : `Updated student ${before.name}`,
          { sensitive: feeChanged },
        );
      }),

    addStudentsBulk: (students) => {
      if (students.length === 0) return 0;
      patch((s) =>
        pushLog(
          {
            ...s,
            students: [
              ...s.students,
              ...students.map((student) => ({
                ...student,
                id: uid("st"),
                clientId: s.activeClientId,
              })),
            ],
          },
          "student",
          `Imported ${students.length} student${students.length === 1 ? "" : "s"}`,
        ),
      );
      return students.length;
    },

    // Soft delete — fee payment history is preserved so restoring a student
    // brings their full record back intact.
    removeStudent: (id) =>
      patch((s) => {
        const st = s.students.find((x) => x.id === id);
        return pushLog(
          {
            ...s,
            students: s.students.map((x) =>
              x.id === id ? { ...x, deletedAt: new Date().toISOString() } : x,
            ),
          },
          "student",
          `Removed student ${st?.name ?? ""}`,
          { sensitive: true },
        );
      }),

    restoreStudent: (id) =>
      patch((s) => {
        const st = s.students.find((x) => x.id === id);
        return pushLog(
          {
            ...s,
            students: s.students.map((x) =>
              x.id === id ? { ...x, deletedAt: null } : x,
            ),
          },
          "student",
          `Restored student ${st?.name ?? ""}`,
        );
      }),

    purgeStudent: (id) =>
      patch((s) => {
        const st = s.students.find((x) => x.id === id);
        return pushLog(
          {
            ...s,
            students: s.students.filter((x) => x.id !== id),
            feePayments: s.feePayments.filter((p) => p.studentId !== id),
          },
          "student",
          `Permanently deleted student ${st?.name ?? ""}`,
          { sensitive: true },
        );
      }),

    recordPayment: (studentId, period, amountPaid, status, note) =>
      patch((s) => {
        const st = s.students.find((x) => x.id === studentId);
        if (!st) return s;
        const existing = s.feePayments.find(
          (p) => p.studentId === studentId && p.period === period,
        );
        const record: FeePayment = {
          id: existing?.id ?? uid("fp"),
          clientId: st.clientId,
          studentId,
          period,
          amountDue: existing?.amountDue ?? st.monthlyFee,
          amountPaid,
          status,
          paidAt: amountPaid > 0 ? new Date().toISOString() : (existing?.paidAt ?? null),
          note: note ?? existing?.note ?? "",
        };
        const feePayments = existing
          ? s.feePayments.map((p) => (p.id === existing.id ? record : p))
          : [...s.feePayments, record];
        return pushLog(
          { ...s, feePayments },
          "payment",
          `Recorded ${period} payment for ${st.name}`,
        );
      }),

    addExpense: (e) =>
      patch((s) =>
        pushLog(
          {
            ...s,
            expenses: [
              ...s.expenses,
              {
                ...e,
                id: uid("ex"),
                clientId: s.activeClientId,
                createdAt: new Date().toISOString(),
              },
            ],
          },
          "expense",
          `Logged expense: ${e.description}`,
        ),
      ),

    updateExpense: (id, p) =>
      patch((s) => {
        const before = s.expenses.find((e) => e.id === id);
        const next = {
          ...s,
          expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...p } : e)),
        };
        if (!before) return next;
        const amountChanged = p.amount !== undefined && p.amount !== before.amount;
        return pushLog(
          next,
          "expense",
          amountChanged
            ? `Changed "${before.description}" amount from ${before.amount} to ${p.amount}`
            : `Updated expense: ${before.description}`,
          { sensitive: amountChanged },
        );
      }),

    removeExpense: (id) =>
      patch((s) => {
        const e = s.expenses.find((x) => x.id === id);
        return pushLog(
          { ...s, expenses: s.expenses.filter((x) => x.id !== id) },
          "expense",
          `Removed expense: ${e?.description ?? ""}`,
          { sensitive: true },
        );
      }),
  };

  return (
    <PayrollContext.Provider value={value}>{children}</PayrollContext.Provider>
  );
}

export function usePayroll() {
  const ctx = useContext(PayrollContext);
  if (!ctx) throw new Error("usePayroll must be used inside PayrollProvider");
  return ctx;
}
