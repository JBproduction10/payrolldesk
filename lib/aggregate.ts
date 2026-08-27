// lib/aggregate.ts
import type {
  Department,
  Employee,
  FeePayment,
  PayField,
  Payslip,
  Student,
  Expense,
  SupplyDelivery,
  SupplySale,
} from "./types";
import { computePayslip } from "./payroll";

export interface DeptPayroll {
  department: Department;
  amount: number;
  headcount: number;
}

/** Projected monthly gross for every active employee, using current field config. */
export function projectedGross(employees: Employee[], fields: PayField[]): number {
  return employees
    .filter((e) => e.status !== "inactive")
    .reduce((sum, e) => sum + computePayslip(e, fields).gross, 0);
}

export function projectedNet(employees: Employee[], fields: PayField[]): number {
  return employees
    .filter((e) => e.status !== "inactive")
    .reduce((sum, e) => sum + computePayslip(e, fields).net, 0);
}

/** Payroll broken down by department, sorted highest first. */
export function payrollByDepartment(
  employees: Employee[],
  fields: PayField[],
  departments: Department[],
): DeptPayroll[] {
  return departments
    .map((department) => {
      const staff = employees.filter(
        (e) => e.departmentId === department.id && e.status !== "inactive",
      );
      const amount = staff.reduce(
        (sum, e) => sum + computePayslip(e, fields).gross,
        0,
      );
      return { department, amount, headcount: staff.length };
    })
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Fee collection + expense summary for the "complete assessment" view:
 * entries (student fees) alongside exits (salaries + operating expenses).
 */
export interface SchoolFinancials {
  studentCount: number;
  feesCollected: number;
  feesOutstanding: number;
  unpaidCount: number;
  socialCaseCount: number;
  expensesThisMonth: number;
}

/** This student's payment record for a given period, if one has been recorded yet. */
export function paymentFor(
  payments: FeePayment[],
  studentId: string,
  period: string,
): FeePayment | undefined {
  return payments.find((p) => p.studentId === studentId && p.period === period);
}

/** All of a student's payment records, most recent period first. */
export function paymentsForStudent(
  payments: FeePayment[],
  studentId: string,
): FeePayment[] {
  return payments
    .filter((p) => p.studentId === studentId)
    .sort((a, b) => (a.period < b.period ? 1 : -1));
}

/** Lifetime total collected from a student across every recorded period. */
export function lifetimeCollected(payments: FeePayment[], studentId: string): number {
  return payments
    .filter((p) => p.studentId === studentId)
    .reduce((sum, p) => sum + p.amountPaid, 0);
}

export function schoolFinancials(
  students: Student[],
  payments: FeePayment[],
  expenses: Expense[],
  period: string,
): SchoolFinancials {
  let feesCollected = 0;
  let feesOutstanding = 0;
  let unpaidCount = 0;
  let socialCaseCount = 0;

  for (const student of students) {
    const record = paymentFor(payments, student.id, period);
    const paid = record?.amountPaid ?? 0;
    feesCollected += paid;

    if (record?.status === "social_case") {
      socialCaseCount += 1;
    } else {
      feesOutstanding += Math.max(0, student.monthlyFee - paid);
      if (!record || record.status === "unpaid") unpaidCount += 1;
    }
  }

  const expensesThisMonth = expenses
    .filter((e) => e.date.slice(0, 7) === period)
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    studentCount: students.length,
    feesCollected,
    feesOutstanding,
    unpaidCount,
    socialCaseCount,
    expensesThisMonth,
  };
}

/**
 * Gross payroll for a given period: sums actual generated payslips when they
 * exist, otherwise falls back to a live projection from current fields —
 * this keeps the current (ungenerated) period on the trend chart honest.
 */
export function grossForPeriod(
  period: string,
  payslips: Payslip[],
  employees: Employee[],
  fields: PayField[],
): number {
  const generated = payslips.filter((p) => p.period === period);
  if (generated.length > 0) {
    return generated.reduce((sum, p) => sum + p.gross, 0);
  }
  return projectedGross(employees, fields);
}

/* --------------------------- Supplies / Intendance ------------------------- */

export interface SupplyStockRow {
  category: SupplyDelivery["category"];
  itemLabel: string;
  delivered: number;
  sold: number;
  /** delivered − sold. Never adjusted by inventory counts — a count is a */
  /** point-in-time check against this, not a correction to it. */
  stock: number;
  revenue: number;
}

/**
 * Stock on hand for one school, grouped by category + item label. Computed
 * purely from Bonté Service deliveries minus Intendance sales — inventory
 * counts are compared against this, never folded into it, so a shortfall
 * stays visible instead of quietly resetting the baseline.
 */
export function supplyStock(
  deliveries: SupplyDelivery[],
  sales: SupplySale[],
): SupplyStockRow[] {
  const rows = new Map<string, SupplyStockRow>();

  function rowFor(category: SupplyDelivery["category"], itemLabel: string) {
    const key = `${category}::${itemLabel}`;
    let row = rows.get(key);
    if (!row) {
      row = { category, itemLabel, delivered: 0, sold: 0, stock: 0, revenue: 0 };
      rows.set(key, row);
    }
    return row;
  }

  for (const d of deliveries) {
    const row = rowFor(d.category, d.itemLabel);
    row.delivered += d.quantity;
  }
  for (const s of sales) {
    const row = rowFor(s.category, s.itemLabel);
    row.sold += s.quantity;
    row.revenue += s.totalAmount;
  }
  for (const row of rows.values()) {
    row.stock = row.delivered - row.sold;
  }

  return [...rows.values()].sort((a, b) => a.itemLabel.localeCompare(b.itemLabel));
}
