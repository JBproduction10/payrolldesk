"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type {
  Client,
  Employee,
  Expense,
  FeePayment,
  Payslip,
  Requisition,
  Student,
  SupplyCategory,
} from "@/lib/types";
import type { SchoolFinancials } from "@/lib/aggregate";
import { PromoterView } from "@/components/portal/promoter-view";
import { TeacherView } from "@/components/portal/teacher-view";
import { FinanceView } from "@/components/portal/finance-view";
import { SchoolAdminView } from "@/components/portal/school-admin-view";
import { CashierView } from "@/components/portal/cashier-view";
import {
  IntendanceView,
  type IntendanceDelivery,
  type IntendanceSale,
  type IntendanceInventoryCount,
} from "@/components/portal/intendance-view";
import {
  TreasuryView,
  type TreasuryRequisition,
  type TreasuryDelivery,
} from "@/components/portal/treasury-view";
import type { SupplyStockRow } from "@/lib/aggregate";

interface PromoterSummary {
  clientId: string;
  name: string;
  currency: Client["currency"];
  studentCount: number;
  feesCollected: number;
  feesOutstanding: number;
  totalSalary: number;
  expensesThisMonth: number;
  net: number;
}

interface PromoterSupplySummary {
  clientId: string;
  name: string;
  currency: Client["currency"];
  unitsDelivered: number;
  unitsSold: number;
  unitsOnHand: number;
  revenue: number;
  varianceCount: number;
}

interface PromoterSupplyStockRow {
  category: SupplyCategory;
  itemLabel: string;
  delivered: number;
  sold: number;
  stock: number;
  revenue: number;
}

interface PromoterSupplyDelivery {
  id: string;
  clientId: string;
  clientName: string;
  category: SupplyCategory;
  itemLabel: string;
  quantity: number;
  deliveredAt: string;
  reference: string;
  recordedBy: string;
  createdAt: string;
}

interface PromoterSupplySale {
  id: string;
  clientId: string;
  clientName: string;
  category: SupplyCategory;
  itemLabel: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  buyerName: string;
  soldAt: string;
  recordedBy: string;
  createdAt: string;
}

interface PromoterInventoryVariance {
  id: string;
  clientId: string;
  clientName: string;
  category: SupplyCategory;
  itemLabel: string;
  countedQty: number;
  expectedQty: number;
  variance: number;
  countedAt: string;
  countedBy: string;
  note: string;
  createdAt: string;
}

interface EmployeeRef {
  id: string;
  name: string;
  position: string;
}

interface SchoolAdminEmployeeRef extends EmployeeRef {
  email: string;
  departmentId: string;
  baseSalary: number;
  status: Employee["status"];
}

interface DepartmentRef {
  id: string;
  name: string;
  description: string;
  headId: string | null;
}

type PortalData =
  | {
      role: "promoter";
      period: string;
      summaries: PromoterSummary[];
      outflows: (Requisition & { clientName: string })[];
      supplySummaries: PromoterSupplySummary[];
      supplyStockByClient: Record<string, PromoterSupplyStockRow[]>;
      recentSupplyDeliveries: PromoterSupplyDelivery[];
      recentSupplySales: PromoterSupplySale[];
      inventoryVariances: PromoterInventoryVariance[];
    }
  | {
      role: "treasury";
      period: string;
      clients: { id: string; name: string; currency: Client["currency"] }[];
      requisitions: TreasuryRequisition[];
      supplyDeliveries: TreasuryDelivery[];
    }
  | {
      role: "school_admin";
      period: string;
      client: Client | null;
      students: Student[];
      feePayments: FeePayment[];
      expenses: Expense[];
      requisitions: Requisition[];
      payslips: Payslip[];
      employees: SchoolAdminEmployeeRef[];
      departments: DepartmentRef[];
    }
  | {
      role: "cashier";
      period: string;
      client: Client | null;
      students: Student[];
      feePayments: FeePayment[];
      expenses: Expense[];
    }
  | {
      role: "finance";
      period: string;
      client: Client | null;
      students: Student[];
      feePayments: FeePayment[];
      financials: SchoolFinancials;
      payslips: Payslip[];
      employees: EmployeeRef[];
    }
  | {
      role: "intendance";
      period: string;
      client: Client | null;
      stock: SupplyStockRow[];
      deliveries: IntendanceDelivery[];
      sales: IntendanceSale[];
      inventoryCounts: IntendanceInventoryCount[];
    }
  | {
      role: "teacher";
      period: string;
      client: Client | null;
      employee: Employee | null;
      payslips: Payslip[];
    };

export default function PortalPage() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/data", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not load your workspace.");
        return;
      }
      setData(json);
      setError(null);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading your workspace…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
        {error ?? "Nothing to show yet."}
      </div>
    );
  }

  if (data.role === "promoter") {
    return (
      <PromoterView
        summaries={data.summaries}
        period={data.period}
        outflows={data.outflows}
        supplySummaries={data.supplySummaries}
        supplyStockByClient={data.supplyStockByClient}
        recentSupplyDeliveries={data.recentSupplyDeliveries}
        recentSupplySales={data.recentSupplySales}
        inventoryVariances={data.inventoryVariances}
      />
    );
  }

  if (data.role === "treasury") {
    return (
      <TreasuryView
        clients={data.clients}
        requisitions={data.requisitions}
        deliveries={data.supplyDeliveries}
        period={data.period}
        onRefresh={load}
      />
    );
  }

  if (!data.client) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
        Your account isn't linked to a school yet — ask your administrator to check
        your access.
      </div>
    );
  }

  if (data.role === "school_admin") {
    return (
      <SchoolAdminView
        client={data.client}
        students={data.students}
        feePayments={data.feePayments}
        expenses={data.expenses}
        requisitions={data.requisitions}
        payslips={data.payslips}
        employees={data.employees}
        departments={data.departments}
        period={data.period}
        onRefresh={load}
      />
    );
  }

  if (data.role === "cashier") {
    return (
      <CashierView
        client={data.client}
        students={data.students}
        feePayments={data.feePayments}
        expenses={data.expenses}
        period={data.period}
        onRefresh={load}
      />
    );
  }

  if (data.role === "finance") {
    return (
      <FinanceView
        client={data.client}
        payslips={data.payslips}
        employees={data.employees}
        students={data.students}
        feePayments={data.feePayments}
        financials={data.financials}
        period={data.period}
      />
    );
  }

  if (data.role === "intendance") {
    return (
      <IntendanceView
        client={data.client}
        stock={data.stock}
        deliveries={data.deliveries}
        sales={data.sales}
        inventoryCounts={data.inventoryCounts}
        onRefresh={load}
      />
    );
  }

  // teacher
  if (!data.employee) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
        Your account isn't linked to an employee record yet — ask your school admin to
        check your access.
      </div>
    );
  }

  return (
    <TeacherView client={data.client} employee={data.employee} payslips={data.payslips} />
  );
}
