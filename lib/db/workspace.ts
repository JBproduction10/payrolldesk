import { getDb } from "../mongodb";
import type {
  Expense,
  FeePayment,
  FeeStatus,
  ID,
  LogActor,
  LogEntry,
  PayrollState,
  Requisition,
  Student,
  SupplyCategory,
  SupplyDelivery,
  SupplyInventoryCount,
  SupplySale,
} from "../types";
import { buildInitialState } from "../seed";
import { seedHistory } from "../seed-history";

interface WorkspaceDoc {
  _id: string; // orgOwnerId (the super_admin's user id) — one document per organisation
  state: PayrollState;
  updatedAt: string;
}

function workspaces() {
  return getDb().then((db) => db.collection<WorkspaceDoc>("workspaces"));
}

/**
 * Returns an organisation's payroll workspace, seeding a fresh demo
 * workspace (and persisting it) the first time it's accessed.
 */
export async function getWorkspace(orgOwnerId: string): Promise<PayrollState> {
  const col = await workspaces();
  const existing = await col.findOne({ _id: orgOwnerId });
  if (existing) return existing.state;

  const seeded = seedHistory(buildInitialState());
  await col.insertOne({
    _id: orgOwnerId,
    state: seeded,
    updatedAt: new Date().toISOString(),
  });
  return seeded;
}

export async function saveWorkspace(
  orgOwnerId: string,
  state: PayrollState,
): Promise<void> {
  const col = await workspaces();
  await col.updateOne(
    { _id: orgOwnerId },
    { $set: { state, updatedAt: new Date().toISOString() } },
    { upsert: true },
  );
}

/** Load → transform → save in one step, for narrow scoped mutations from the portal API. */
async function mutateWorkspace(
  orgOwnerId: string,
  fn: (state: PayrollState) => PayrollState,
): Promise<PayrollState> {
  const current = await getWorkspace(orgOwnerId);
  const next = fn(current);
  await saveWorkspace(orgOwnerId, next);
  return next;
}

function uid(prefix: string): ID {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Appends one entry to the shared audit trail (`state.logs`) — the same log
 * every super_admin dashboard action writes to, so portal-side actions by
 * school admins / finance / teachers show up right alongside them. Used by
 * every scoped mutation below, and by the team-management routes.
 */
function withLog(
  s: PayrollState,
  clientId: ID,
  kind: LogEntry["kind"],
  message: string,
  actor: LogActor,
  sensitive?: boolean,
): PayrollState {
  return {
    ...s,
    logs: [
      {
        id: uid("log"),
        clientId,
        at: new Date().toISOString(),
        kind,
        message,
        actor,
        sensitive,
      },
      ...s.logs,
    ].slice(0, 1000),
  };
}

/** Records a team-management event (invite, role change, removal) — not tied to a client. */
export async function appendTeamAuditLog(
  orgOwnerId: string,
  message: string,
  actor: LogActor,
): Promise<void> {
  await mutateWorkspace(orgOwnerId, (s) =>
    withLog(s, s.activeClientId, "team", message, actor, true),
  );
}

/* --------------------------- scoped: students --------------------------- */

export async function addStudentScoped(
  orgOwnerId: string,
  clientId: string,
  input: Omit<Student, "id" | "clientId">,
  actor: LogActor,
): Promise<Student> {
  const student: Student = { ...input, id: uid("st"), clientId };
  await mutateWorkspace(orgOwnerId, (s) =>
    withLog(
      { ...s, students: [...s.students, student] },
      clientId,
      "student",
      `Added student ${student.name}`,
      actor,
    ),
  );
  return student;
}

export async function updateStudentScoped(
  orgOwnerId: string,
  clientId: string,
  studentId: string,
  patch: Partial<Student>,
  actor: LogActor,
): Promise<void> {
  await mutateWorkspace(orgOwnerId, (s) => {
    const before = s.students.find((st) => st.id === studentId && st.clientId === clientId);
    const next = {
      ...s,
      students: s.students.map((st) =>
        st.id === studentId && st.clientId === clientId ? { ...st, ...patch } : st,
      ),
    };
    if (!before) return next;
    const feeChanged =
      patch.monthlyFee !== undefined && patch.monthlyFee !== before.monthlyFee;
    return withLog(
      next,
      clientId,
      "student",
      feeChanged
        ? `Changed ${before.name}'s monthly fee from ${before.monthlyFee} to ${patch.monthlyFee}`
        : `Updated student ${before.name}`,
      actor,
      feeChanged,
    );
  });
}

/**
 * Soft delete — the record is flagged with `deletedAt` rather than removed,
 * so a super_admin can see and restore it from the Trash view even though
 * this delete came from the school-admin portal.
 */
export async function removeStudentScoped(
  orgOwnerId: string,
  clientId: string,
  studentId: string,
  actor: LogActor,
): Promise<void> {
  await mutateWorkspace(orgOwnerId, (s) => {
    const st = s.students.find((x) => x.id === studentId && x.clientId === clientId);
    return withLog(
      {
        ...s,
        students: s.students.map((x) =>
          x.id === studentId && x.clientId === clientId
            ? { ...x, deletedAt: new Date().toISOString() }
            : x,
        ),
      },
      clientId,
      "student",
      `Removed student ${st?.name ?? ""}`,
      actor,
      true,
    );
  });
}

/** Upserts a student's fee-payment record for one period — the month-to-month ledger. */
export async function recordPaymentScoped(
  orgOwnerId: string,
  clientId: string,
  studentId: string,
  period: string,
  amountPaid: number,
  status: FeeStatus,
  actor: LogActor,
  note?: string,
): Promise<void> {
  await mutateWorkspace(orgOwnerId, (s) => {
    const student = s.students.find((st) => st.id === studentId && st.clientId === clientId);
    if (!student) return s;

    const existing = s.feePayments.find(
      (p) => p.studentId === studentId && p.period === period,
    );
    const record: FeePayment = {
      id: existing?.id ?? `fp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      clientId,
      studentId,
      period,
      amountDue: existing?.amountDue ?? student.monthlyFee,
      amountPaid,
      status,
      paidAt: amountPaid > 0 ? new Date().toISOString() : (existing?.paidAt ?? null),
      note: note ?? existing?.note ?? "",
    };

    return withLog(
      {
        ...s,
        feePayments: existing
          ? s.feePayments.map((p) => (p.id === existing.id ? record : p))
          : [...s.feePayments, record],
      },
      clientId,
      "payment",
      `Recorded ${period} payment for ${student.name}`,
      actor,
    );
  });
}

/* --------------------------- scoped: expenses --------------------------- */

export async function addExpenseScoped(
  orgOwnerId: string,
  clientId: string,
  input: Omit<Expense, "id" | "clientId" | "createdAt">,
  actor: LogActor,
): Promise<Expense> {
  const expense: Expense = {
    ...input,
    id: uid("ex"),
    clientId,
    createdAt: new Date().toISOString(),
  };
  await mutateWorkspace(orgOwnerId, (s) =>
    withLog(
      { ...s, expenses: [...s.expenses, expense] },
      clientId,
      "expense",
      `Logged expense: ${expense.description}`,
      actor,
    ),
  );
  return expense;
}

export async function updateExpenseScoped(
  orgOwnerId: string,
  clientId: string,
  expenseId: string,
  patch: Partial<Expense>,
  actor: LogActor,
): Promise<void> {
  await mutateWorkspace(orgOwnerId, (s) => {
    const before = s.expenses.find((e) => e.id === expenseId && e.clientId === clientId);
    const next = {
      ...s,
      expenses: s.expenses.map((e) =>
        e.id === expenseId && e.clientId === clientId ? { ...e, ...patch } : e,
      ),
    };
    if (!before) return next;
    const amountChanged = patch.amount !== undefined && patch.amount !== before.amount;
    return withLog(
      next,
      clientId,
      "expense",
      amountChanged
        ? `Changed "${before.description}" amount from ${before.amount} to ${patch.amount}`
        : `Updated expense: ${before.description}`,
      actor,
      amountChanged,
    );
  });
}

export async function removeExpenseScoped(
  orgOwnerId: string,
  clientId: string,
  expenseId: string,
  actor: LogActor,
): Promise<void> {
  await mutateWorkspace(orgOwnerId, (s) => {
    const e = s.expenses.find((x) => x.id === expenseId && x.clientId === clientId);
    return withLog(
      {
        ...s,
        expenses: s.expenses.filter((x) => !(x.id === expenseId && x.clientId === clientId)),
      },
      clientId,
      "expense",
      `Removed expense: ${e?.description ?? ""}`,
      actor,
      true,
    );
  });
}

/* ------------------------ scoped: requisitions (Treasury) ------------------------ */
//
// The fund-request pipeline: a school submits a requisition, Treasury
// (org-wide — not scoped to any one school) approves or rejects it, and an
// approved one gets marked paid with the actual amount/method once the
// money moves. Every step is logged with the actor, since this is the
// control point the client specifically asked for to curb Treasury-side
// leakage.

const CATEGORY_LABEL: Record<Requisition["category"], string> = {
  fund_request: "fund request",
  payroll: "payroll funding request",
};

export async function submitRequisitionScoped(
  orgOwnerId: string,
  clientId: string,
  input: {
    category: Requisition["category"];
    description: string;
    amountRequested: number;
    period?: string;
  },
  actor: LogActor,
): Promise<Requisition> {
  const requisition: Requisition = {
    id: uid("req"),
    clientId,
    category: input.category,
    description: input.description,
    amountRequested: input.amountRequested,
    period: input.period,
    status: "pending",
    submittedBy: actor.name,
    submittedAt: new Date().toISOString(),
  };
  await mutateWorkspace(orgOwnerId, (s) =>
    withLog(
      { ...s, requisitions: [...s.requisitions, requisition] },
      clientId,
      "requisition",
      `Submitted a ${CATEGORY_LABEL[requisition.category]}: ${requisition.description} (${requisition.amountRequested})`,
      actor,
    ),
  );
  return requisition;
}

/**
 * Treasury approves or rejects a pending requisition. Only "treasury" role
 * should ever call this — enforced by the API route, not here.
 */
export async function decideRequisitionScoped(
  orgOwnerId: string,
  requisitionId: string,
  decision: "approved" | "rejected",
  note: string | undefined,
  actor: LogActor,
): Promise<void> {
  await mutateWorkspace(orgOwnerId, (s) => {
    const before = s.requisitions.find((r) => r.id === requisitionId);
    if (!before || before.status !== "pending") return s;
    const next = {
      ...s,
      requisitions: s.requisitions.map((r) =>
        r.id === requisitionId
          ? {
              ...r,
              status: decision,
              decidedBy: actor.name,
              decidedAt: new Date().toISOString(),
              decisionNote: note,
            }
          : r,
      ),
    };
    return withLog(
      next,
      before.clientId,
      "requisition",
      `${decision === "approved" ? "Approved" : "Rejected"} ${before.submittedBy}'s ${CATEGORY_LABEL[before.category]}: ${before.description}${note ? ` — ${note}` : ""}`,
      actor,
      true,
    );
  });
}

/** Treasury records that an already-approved requisition has actually been paid out. */
export async function markRequisitionPaidScoped(
  orgOwnerId: string,
  requisitionId: string,
  paidAmount: number,
  paymentMethod: string,
  actor: LogActor,
): Promise<void> {
  await mutateWorkspace(orgOwnerId, (s) => {
    const before = s.requisitions.find((r) => r.id === requisitionId);
    if (!before || before.status !== "approved") return s;
    const next = {
      ...s,
      requisitions: s.requisitions.map((r) =>
        r.id === requisitionId
          ? {
              ...r,
              status: "paid" as const,
              paidAmount,
              paidAt: new Date().toISOString(),
              paymentMethod,
            }
          : r,
      ),
    };
    return withLog(
      next,
      before.clientId,
      "requisition",
      `Paid out ${paidAmount} (${paymentMethod}) for ${before.submittedBy}'s ${CATEGORY_LABEL[before.category]}: ${before.description}`,
      actor,
      true,
    );
  });
}

/* --------------------- scoped: supplies / Intendance --------------------- */
//
// Intendance never buys — Bonté Service always assures delivery of what's
// to be sold — so a delivery can only be recorded from the Treasury side,
// pushed to one school. Intendance's own actions can only sell stock back
// out or record a physical count against it; neither one can create stock
// out of nothing, which is the point.

const CATEGORY_LABEL_SUPPLY: Record<SupplyCategory, string> = {
  uniform: "uniform",
  shoes: "shoes",
  sweater: "sweater",
  other: "item",
};

/** Treasury (Bonté Service) only — pushes stock to a school. */
export async function recordSupplyDeliveryScoped(
  orgOwnerId: string,
  clientId: string,
  input: {
    category: SupplyCategory;
    itemLabel: string;
    quantity: number;
    deliveredAt: string;
    reference: string;
  },
  actor: LogActor,
): Promise<SupplyDelivery> {
  const delivery: SupplyDelivery = {
    id: uid("sd"),
    clientId,
    category: input.category,
    itemLabel: input.itemLabel,
    quantity: input.quantity,
    deliveredAt: input.deliveredAt,
    reference: input.reference,
    recordedBy: actor.name,
    createdAt: new Date().toISOString(),
  };
  await mutateWorkspace(orgOwnerId, (s) =>
    withLog(
      { ...s, supplyDeliveries: [...s.supplyDeliveries, delivery] },
      clientId,
      "supply",
      `Delivered ${delivery.quantity}× ${delivery.itemLabel} (${CATEGORY_LABEL_SUPPLY[delivery.category]}) — ref ${delivery.reference}`,
      actor,
    ),
  );
  return delivery;
}

/** Intendance only — records a sale against stock already on hand. */
export async function recordSupplySaleScoped(
  orgOwnerId: string,
  clientId: string,
  input: {
    category: SupplyCategory;
    itemLabel: string;
    quantity: number;
    unitPrice: number;
    buyerName: string;
    soldAt: string;
  },
  actor: LogActor,
): Promise<SupplySale> {
  const sale: SupplySale = {
    id: uid("ss"),
    clientId,
    category: input.category,
    itemLabel: input.itemLabel,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    totalAmount: input.quantity * input.unitPrice,
    buyerName: input.buyerName,
    soldAt: input.soldAt,
    recordedBy: actor.name,
    createdAt: new Date().toISOString(),
  };
  await mutateWorkspace(orgOwnerId, (s) =>
    withLog(
      { ...s, supplySales: [...s.supplySales, sale] },
      clientId,
      "supply",
      `Sold ${sale.quantity}× ${sale.itemLabel} to ${sale.buyerName} (${sale.totalAmount})`,
      actor,
    ),
  );
  return sale;
}

/**
 * Intendance only — logs a physical count against the system-computed
 * stock (deliveries − sales) at the moment of counting. The variance is
 * stored as-is and never used to "correct" future stock math — it's the
 * anti-theft signal the client asked this module to surface, so every gap
 * stays visible in the log rather than being silently absorbed.
 */
export async function recordSupplyInventoryCountScoped(
  orgOwnerId: string,
  clientId: string,
  input: {
    category: SupplyCategory;
    itemLabel: string;
    countedQty: number;
    countedAt: string;
    note?: string;
  },
  actor: LogActor,
): Promise<SupplyInventoryCount> {
  const next = await mutateWorkspace(orgOwnerId, (s) => {
    const delivered = s.supplyDeliveries
      .filter((d) => d.clientId === clientId && d.category === input.category && d.itemLabel === input.itemLabel)
      .reduce((sum, d) => sum + d.quantity, 0);
    const sold = s.supplySales
      .filter((sl) => sl.clientId === clientId && sl.category === input.category && sl.itemLabel === input.itemLabel)
      .reduce((sum, sl) => sum + sl.quantity, 0);
    const expectedQty = delivered - sold;
    const count: SupplyInventoryCount = {
      id: uid("sic"),
      clientId,
      category: input.category,
      itemLabel: input.itemLabel,
      countedQty: input.countedQty,
      expectedQty,
      variance: input.countedQty - expectedQty,
      countedAt: input.countedAt,
      countedBy: actor.name,
      note: input.note ?? "",
      createdAt: new Date().toISOString(),
    };
    return withLog(
      { ...s, supplyInventoryCounts: [...s.supplyInventoryCounts, count] },
      clientId,
      "supply",
      count.variance === 0
        ? `Counted ${count.itemLabel}: matches (${count.countedQty})`
        : `Counted ${count.itemLabel}: ${count.countedQty} vs expected ${count.expectedQty} (${count.variance > 0 ? "+" : ""}${count.variance})`,
      actor,
      count.variance !== 0,
    );
  });
  // The mutation always appends exactly one new count, so it's the last entry.
  return next.supplyInventoryCounts[next.supplyInventoryCounts.length - 1];
}
