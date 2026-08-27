import { getWorkspace } from "./workspace";
import { computePayslip } from "../payroll";
import { schoolFinancials, supplyStock } from "../aggregate";
import type { Role } from "../types";

export interface PortalScope {
  role: Role;
  orgOwnerId: string;
  clientId: string | null;
  employeeId: string | null;
}

export async function getPortalData(scope: PortalScope) {
  const state = await getWorkspace(scope.orgOwnerId);

  if (scope.role === "treasury") {
    // Org-wide, like promoter — Treasury needs to see every school's queue,
    // not just one. Requisitions are returned newest-first so the pending
    // queue naturally surfaces what's waiting on a decision.
    const clientName = new Map(state.clients.map((c) => [c.id, c.name]));
    return {
      role: scope.role,
      period: state.period,
      clients: state.clients.map((c) => ({ id: c.id, name: c.name, currency: c.currency })),
      requisitions: [...state.requisitions]
        .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))
        .map((r) => ({ ...r, clientName: clientName.get(r.clientId) ?? r.clientId })),
      // Deliveries Treasury has already pushed out — newest first, across
      // every school, so a repeat delivery to the same item is easy to spot.
      supplyDeliveries: [...state.supplyDeliveries]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((d) => ({ ...d, clientName: clientName.get(d.clientId) ?? d.clientId })),
    };
  }

  if (scope.role === "promoter") {
    const summaries = state.clients.map((client) => {
      const staff = state.employees.filter(
        (e) => e.clientId === client.id && e.status !== "inactive",
      );
      const fields = state.fields.filter((f) => f.clientId === client.id);
      const totalSalary = staff.reduce(
        (sum, e) => sum + computePayslip(e, fields).gross,
        0,
      );
      const students = state.students.filter((s) => s.clientId === client.id);
      const payments = state.feePayments.filter((p) => p.clientId === client.id);
      const expenses = state.expenses.filter((e) => e.clientId === client.id);
      const fin = schoolFinancials(students, payments, expenses, state.period);
      return {
        clientId: client.id,
        name: client.name,
        currency: client.currency,
        studentCount: fin.studentCount,
        feesCollected: fin.feesCollected,
        feesOutstanding: fin.feesOutstanding,
        totalSalary,
        expensesThisMonth: fin.expensesThisMonth,
        net: fin.feesCollected - totalSalary - fin.expensesThisMonth,
      };
    });
    // The Treasury outflow trail the promoter specifically asked to see —
    // every requisition that's actually been paid, across every school.
    const clientName = new Map(state.clients.map((c) => [c.id, c.name]));
    const outflows = state.requisitions
      .filter((r) => r.status === "paid")
      .sort((a, b) => ((a.paidAt ?? "") < (b.paidAt ?? "") ? 1 : -1))
      .map((r) => ({ ...r, clientName: clientName.get(r.clientId) ?? r.clientId }));

    // Supplies/logistics, per the same "Bonté Service delivers, the school
    // only sells and counts" model — the promoter sees stock, sales and
    // flagged inventory gaps across every school, not just one.
    const supplyStockByClient: Record<string, ReturnType<typeof supplyStock>> = {};
    const supplySummaries = state.clients.map((client) => {
      const deliveries = state.supplyDeliveries.filter((d) => d.clientId === client.id);
      const sales = state.supplySales.filter((s) => s.clientId === client.id);
      const stock = supplyStock(deliveries, sales);
      supplyStockByClient[client.id] = stock;
      const varianceCount = state.supplyInventoryCounts.filter(
        (c) => c.clientId === client.id && c.variance !== 0,
      ).length;
      return {
        clientId: client.id,
        name: client.name,
        currency: client.currency,
        unitsDelivered: stock.reduce((sum, r) => sum + r.delivered, 0),
        unitsSold: stock.reduce((sum, r) => sum + r.sold, 0),
        unitsOnHand: stock.reduce((sum, r) => sum + r.stock, 0),
        revenue: stock.reduce((sum, r) => sum + r.revenue, 0),
        varianceCount,
      };
    });
    const recentSupplyDeliveries = [...state.supplyDeliveries]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 20)
      .map((d) => ({ ...d, clientName: clientName.get(d.clientId) ?? d.clientId }));
    const recentSupplySales = [...state.supplySales]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 20)
      .map((s) => ({ ...s, clientName: clientName.get(s.clientId) ?? s.clientId }));
    const inventoryVariances = state.supplyInventoryCounts
      .filter((c) => c.variance !== 0)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((c) => ({ ...c, clientName: clientName.get(c.clientId) ?? c.clientId }));

    return {
      role: scope.role,
      period: state.period,
      summaries,
      outflows,
      supplySummaries,
      supplyStockByClient,
      recentSupplyDeliveries,
      recentSupplySales,
      inventoryVariances,
    };
  }

  const client = state.clients.find((c) => c.id === scope.clientId) ?? null;
  if (!client) {
    return { role: scope.role, period: state.period, client: null };
  }

  if (scope.role === "cashier") {
    // The only school-level role that can actually touch student records —
    // enroll, edit, and change fee status on collection. Doesn't see
    // requisitions or payslips; that's Session 1 (school_admin) and
    // Session 2 (finance)'s job respectively.
    return {
      role: scope.role,
      period: state.period,
      client,
      students: state.students.filter((s) => s.clientId === client.id),
      feePayments: state.feePayments.filter((p) => p.clientId === client.id),
      expenses: state.expenses.filter((e) => e.clientId === client.id),
    };
  }

  if (scope.role === "school_admin") {
    return {
      role: scope.role,
      period: state.period,
      client,
      students: state.students.filter((s) => s.clientId === client.id),
      feePayments: state.feePayments.filter((p) => p.clientId === client.id),
      expenses: state.expenses.filter((e) => e.clientId === client.id),
      requisitions: state.requisitions
        .filter((r) => r.clientId === client.id)
        .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1)),
      payslips: state.payslips
        .filter((p) => p.clientId === client.id)
        .sort((a, b) => (a.period < b.period ? 1 : -1))
        .slice(0, 60),
      employees: state.employees
        .filter((e) => e.clientId === client.id)
        .map((e) => ({ id: e.id, name: e.name, position: e.position })),
    };
  }

  if (scope.role === "finance") {
    // "Responsable Financier" — verifies student fee status and generates
    // the financial report, but (per the spec) has no enrollment or
    // status-change rights, so students/feePayments are read-only here;
    // the write routes only ever accept "cashier".
    const students = state.students.filter((s) => s.clientId === client.id);
    const feePayments = state.feePayments.filter((p) => p.clientId === client.id);
    const expenses = state.expenses.filter((e) => e.clientId === client.id);
    return {
      role: scope.role,
      period: state.period,
      client,
      students,
      feePayments,
      financials: schoolFinancials(students, feePayments, expenses, state.period),
      payslips: state.payslips
        .filter((p) => p.clientId === client.id)
        .sort((a, b) => (a.period < b.period ? 1 : -1))
        .slice(0, 120),
      employees: state.employees
        .filter((e) => e.clientId === client.id)
        .map((e) => ({ id: e.id, name: e.name, position: e.position })),
    };
  }

  if (scope.role === "intendance") {
    const deliveries = state.supplyDeliveries.filter((d) => d.clientId === client.id);
    const sales = state.supplySales.filter((s) => s.clientId === client.id);
    return {
      role: scope.role,
      period: state.period,
      client,
      stock: supplyStock(deliveries, sales),
      deliveries: [...deliveries].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      sales: [...sales].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      inventoryCounts: [...state.supplyInventoryCounts]
        .filter((c) => c.clientId === client.id)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    };
  }

  // teacher
  const employee = state.employees.find((e) => e.id === scope.employeeId) ?? null;
  return {
    role: scope.role,
    period: state.period,
    client,
    employee,
    payslips: employee
      ? state.payslips
          .filter((p) => p.employeeId === employee.id)
          .sort((a, b) => (a.period < b.period ? 1 : -1))
      : [],
  };
}
