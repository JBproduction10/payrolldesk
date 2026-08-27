// lib/seed.ts
import type {
  Client,
  Department,
  Employee,
  Expense,
  FeePayment,
  FeeStatus,
  PayField,
  PayrollState,
  Student,
  SupplyCategory,
  SupplyDelivery,
  SupplyInventoryCount,
  SupplySale,
  Templates,
} from "./types";
import { shiftPeriod, toPeriod } from "./format";

const COLORS = ["pine", "gold", "olive", "pine-mid", "clay", "pine-deep"];

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

export const clients: Client[] = [
  {
    id: "c_acme",
    name: "Acme Corp",
    domain: "acme.io",
    description: "Software & platform services",
    color: "pine",
    currency: "USD",
    payDay: 31,
    createdAt: "2023-02-14",
  },
  {
    id: "c_globex",
    name: "Globex Digital",
    domain: "globex.io",
    description: "Creative digital agency",
    color: "gold",
    currency: "GBP",
    payDay: 28,
    createdAt: "2024-06-03",
  },
  {
    id: "c_northwind",
    name: "Northwind Retail",
    domain: "northwind.shop",
    description: "Retail & e-commerce",
    color: "olive",
    currency: "USD",
    payDay: 25,
    createdAt: "2025-01-20",
  },
  {
    id: "c_sunrise",
    name: "Sunrise Academy",
    domain: "sunriseacademy.edu",
    description: "Primary & secondary school",
    color: "pine-mid",
    currency: "USD",
    payDay: 28,
    createdAt: "2022-09-01",
  },
];

/* ------------------------------------------------------------------ */
/* Departments + staff, expressed compactly then expanded              */
/* ------------------------------------------------------------------ */

type StaffSeed = [name: string, position: string, salary: number, status?: "leave" | "inactive"];
type DeptSeed = {
  key: string;
  name: string;
  description: string;
  staff: StaffSeed[];
};

const acmeDepts: DeptSeed[] = [
  {
    key: "eng",
    name: "Engineering",
    description: "Product development, platform and infrastructure",
    staff: [
      ["Maya Patel", "CTO", 12500],
      ["Ethan Brooks", "Senior Engineer", 9200],
      ["Nora Haddad", "Senior Engineer", 8800],
      ["Owen Clark", "Engineer", 6400],
      ["Ava Thompson", "Engineer", 6100, "leave"],
      ["Leo Martins", "QA Engineer", 5200],
    ],
  },
  {
    key: "sales",
    name: "Sales",
    description: "Revenue, accounts and business development",
    staff: [
      ["Jordan Lee", "Head of Sales", 8200],
      ["Carlos Rivera", "Account Executive", 7200],
      ["Nadia Farouk", "Account Executive", 6400],
      ["Isabel Moreno", "Sales Development Rep", 5600],
    ],
  },
  {
    key: "mkt",
    name: "Marketing",
    description: "Brand, growth and content",
    staff: [
      ["Sofia Reyes", "Marketing Director", 8200],
      ["Liam Osei", "Growth Manager", 6200],
      ["Zara Blake", "Content Lead", 5400],
    ],
  },
  {
    key: "hr",
    name: "Human Resources",
    description: "People, culture and recruiting",
    staff: [
      ["Daniel Kim", "HR Manager", 7600],
      ["Grace Wanjiru", "People Partner", 5600],
    ],
  },
  {
    key: "fin",
    name: "Finance",
    description: "Accounting, budgeting and compliance",
    staff: [
      ["Amara Okafor", "Finance Director", 9000],
      ["Hana Zhou", "Financial Analyst", 7000],
      ["Luca Neri", "Accountant", 6400],
    ],
  },
  {
    key: "ops",
    name: "Operations",
    description: "Logistics, facilities and support",
    staff: [
      ["Lucas Mendes", "Operations Manager", 7000],
      ["Hugo Silva", "Operations Analyst", 5600],
      ["Omar Faruk", "Facilities Coordinator", 5000],
    ],
  },
  {
    key: "cs",
    name: "Customer Support",
    description: "Client success and helpdesk",
    staff: [
      ["Priya Nair", "Support Lead", 5300],
      ["Sena Turan", "Support Specialist", 3900],
      ["Elena Rossi", "Support Specialist", 3600],
      ["Ben Carter", "Support Associate", 3300],
    ],
  },
];

const globexDepts: DeptSeed[] = [
  {
    key: "design",
    name: "Design Studio",
    description: "Brand identity and product design",
    staff: [
      ["Iris Calloway", "Creative Director", 7400],
      ["Theo Nakamura", "Senior Designer", 5200],
      ["Mila Vance", "Motion Designer", 4600],
    ],
  },
  {
    key: "accounts",
    name: "Client Accounts",
    description: "Account management and delivery",
    staff: [
      ["Rowan Blake", "Account Director", 6800],
      ["Sadie Wren", "Account Manager", 4400],
    ],
  },
  {
    key: "studio",
    name: "Production",
    description: "Film, photo and post-production",
    staff: [
      ["Kofi Mensah", "Producer", 5600],
      ["Elsa Lindqvist", "Editor", 4200],
    ],
  },
  {
    key: "admin",
    name: "Studio Admin",
    description: "Finance and office operations",
    staff: [["Harriet Doyle", "Studio Manager", 4000]],
  },
];

const northwindDepts: DeptSeed[] = [
  {
    key: "store",
    name: "Store Floor",
    description: "In-store sales and merchandising",
    staff: [
      ["Marcus Hale", "Store Manager", 5200],
      ["Tara Boyd", "Shift Supervisor", 3600],
      ["Kai Ferreira", "Sales Associate", 2900],
    ],
  },
  {
    key: "warehouse",
    name: "Warehouse",
    description: "Stock, picking and dispatch",
    staff: [
      ["Dmitri Volkov", "Warehouse Lead", 4200],
      ["Nia Roberts", "Fulfilment Associate", 3100],
    ],
  },
  {
    key: "ecom",
    name: "E-commerce",
    description: "Online storefront and listings",
    staff: [
      ["Yara Haddad", "E-commerce Manager", 5800],
      ["Felix Adeyemi", "Listings Specialist", 3400],
    ],
  },
  {
    key: "care",
    name: "Customer Care",
    description: "Orders, returns and enquiries",
    staff: [["Jonah Pike", "Care Specialist", 3000]],
  },
  {
    key: "finance",
    name: "Finance",
    description: "Bookkeeping and payroll liaison",
    staff: [["Beatrice Okonkwo", "Bookkeeper", 4400]],
  },
];

const sunriseDepts: DeptSeed[] = [
  {
    key: "teaching",
    name: "Teaching Staff",
    description: "Classroom teachers across all grades",
    staff: [
      ["Grace Mbeki", "Head Teacher", 1800],
      ["Samuel Osei", "Grade 5 Teacher", 1200],
      ["Fatou Diallo", "Grade 4 Teacher", 1150],
      ["Peter Nyong", "Grade 3 Teacher", 1100],
      ["Aisha Bello", "Grade 2 Teacher", 1050],
      ["Emmanuel Tetteh", "Grade 1 Teacher", 1000],
    ],
  },
  {
    key: "admin",
    name: "Administration",
    description: "School office, finance and support staff",
    staff: [
      ["Ruth Adjei", "School Administrator", 1400],
      ["Kwame Asante", "Finance Officer", 1300],
      ["Comfort Boateng", "Office Assistant", 700],
      ["Yaw Owusu", "Groundskeeper", 600],
    ],
  },
];

const DEPT_SETS: Record<string, DeptSeed[]> = {
  c_acme: acmeDepts,
  c_globex: globexDepts,
  c_northwind: northwindDepts,
  c_sunrise: sunriseDepts,
};

function emailFor(name: string, domain: string) {
  return `${name.toLowerCase().replace(/[^a-z ]/g, "").split(" ").join(".")}@${domain}`;
}

function buildOrg() {
  const departments: Department[] = [];
  const employees: Employee[] = [];

  for (const client of clients) {
    const set = DEPT_SETS[client.id];
    let n = 0;
    set.forEach((dept, di) => {
      const deptId = `d_${client.id.slice(2)}_${dept.key}`;
      const members: Employee[] = [];
      dept.staff.forEach((s, si) => {
        n += 1;
        const [name, position, baseSalary, status] = s;
        const code = `${client.name.slice(0, 2).toUpperCase()}-${String(n).padStart(3, "0")}`;
        members.push({
          id: `e_${client.id.slice(2)}_${dept.key}_${si}`,
          clientId: client.id,
          departmentId: deptId,
          code,
          name,
          email: emailFor(name, client.domain),
          phone: `+1 555 0${String(100 + n).slice(-3)} ${String(1000 + n * 7).slice(-4)}`,
          position,
          baseSalary,
          status: status ?? "active",
          joinDate: `20${20 + (n % 6)}-${String(((n * 3) % 12) + 1).padStart(2, "0")}-${String(((n * 5) % 27) + 1).padStart(2, "0")}`,
          channels: si % 4 === 3 ? ["email"] : ["email", "whatsapp"],
          values: {},
        });
      });

      departments.push({
        id: deptId,
        clientId: client.id,
        name: dept.name,
        description: dept.description,
        headId: members[0]?.id ?? null,
        color: COLORS[di % COLORS.length],
      });
      employees.push(...members);
    });
  }

  return { departments, employees };
}

/* ------------------------------------------------------------------ */
/* Payslip field definitions                                           */
/* ------------------------------------------------------------------ */

function baseField(clientId: string): PayField {
  return {
    id: `f_${clientId.slice(2)}_basic`,
    clientId,
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
  };
}

type FieldSeed = Omit<PayField, "id" | "clientId" | "order">;

const acmeFields: FieldSeed[] = [
  {
    label: "Housing Allowance",
    category: "earning",
    type: "fixed",
    amount: 800,
    textValue: "",
    required: false,
    departmentIds: [],
    note: "Flat monthly housing support",
  },
  {
    label: "Transport Allowance",
    category: "earning",
    type: "fixed",
    amount: 300,
    textValue: "",
    required: false,
    departmentIds: [],
    note: "",
  },
  {
    label: "Performance Bonus",
    category: "earning",
    type: "percent",
    amount: 5,
    textValue: "",
    required: false,
    departmentIds: [],
    note: "",
  },
  {
    label: "Sales Commission",
    category: "earning",
    type: "percent",
    amount: 8,
    textValue: "",
    required: false,
    departmentIds: ["d_acme_sales"],
    note: "Sales team only",
  },
  {
    label: "On-call Allowance",
    category: "earning",
    type: "fixed",
    amount: 250,
    textValue: "",
    required: false,
    departmentIds: ["d_acme_eng"],
    note: "Engineering rota",
  },
  {
    label: "Income Tax",
    category: "deduction",
    type: "percent",
    amount: 10,
    textValue: "",
    required: true,
    departmentIds: [],
    note: "",
  },
  {
    label: "Pension Contribution",
    category: "deduction",
    type: "percent",
    amount: 5,
    textValue: "",
    required: true,
    departmentIds: [],
    note: "",
  },
  {
    label: "Health Insurance",
    category: "deduction",
    type: "fixed",
    amount: 120,
    textValue: "",
    required: false,
    departmentIds: [],
    note: "",
  },
  {
    label: "Bank Account",
    category: "info",
    type: "text",
    amount: 0,
    textValue: "•••• 0000",
    required: true,
    departmentIds: [],
    note: "",
  },
  {
    label: "Tax ID",
    category: "info",
    type: "text",
    amount: 0,
    textValue: "TIN-000000",
    required: false,
    departmentIds: [],
    note: "",
  },
];

const globexFields: FieldSeed[] = [
  {
    label: "Studio Allowance",
    category: "earning",
    type: "fixed",
    amount: 450,
    textValue: "",
    required: false,
    departmentIds: [],
    note: "",
  },
  {
    label: "Project Bonus",
    category: "earning",
    type: "percent",
    amount: 6,
    textValue: "",
    required: false,
    departmentIds: [],
    note: "",
  },
  {
    label: "PAYE",
    category: "deduction",
    type: "percent",
    amount: 20,
    textValue: "",
    required: true,
    departmentIds: [],
    note: "",
  },
  {
    label: "National Insurance",
    category: "deduction",
    type: "percent",
    amount: 8,
    textValue: "",
    required: true,
    departmentIds: [],
    note: "",
  },
  {
    label: "Bank Account",
    category: "info",
    type: "text",
    amount: 0,
    textValue: "•••• 0000",
    required: true,
    departmentIds: [],
    note: "",
  },
];

const northwindFields: FieldSeed[] = [
  {
    label: "Shift Allowance",
    category: "earning",
    type: "fixed",
    amount: 200,
    textValue: "",
    required: false,
    departmentIds: [],
    note: "",
  },
  {
    label: "Overtime",
    category: "earning",
    type: "perEmployee",
    amount: 0,
    textValue: "",
    required: false,
    departmentIds: [],
    note: "Entered per employee each cycle",
  },
  {
    label: "Store Bonus",
    category: "earning",
    type: "percent",
    amount: 4,
    textValue: "",
    required: false,
    departmentIds: ["d_northwind_store"],
    note: "Store floor only",
  },
  {
    label: "Income Tax",
    category: "deduction",
    type: "percent",
    amount: 12,
    textValue: "",
    required: true,
    departmentIds: [],
    note: "",
  },
  {
    label: "Uniform Levy",
    category: "deduction",
    type: "fixed",
    amount: 40,
    textValue: "",
    required: false,
    departmentIds: ["d_northwind_store", "d_northwind_warehouse"],
    note: "",
  },
  {
    label: "Bank Account",
    category: "info",
    type: "text",
    amount: 0,
    textValue: "•••• 0000",
    required: true,
    departmentIds: [],
    note: "",
  },
];

const sunriseFields: FieldSeed[] = [
  {
    label: "Housing Allowance",
    category: "earning",
    type: "fixed",
    amount: 150,
    textValue: "",
    required: false,
    departmentIds: [],
    note: "",
  },
  {
    label: "Transport Allowance",
    category: "earning",
    type: "fixed",
    amount: 80,
    textValue: "",
    required: false,
    departmentIds: [],
    note: "",
  },
  {
    label: "Income Tax",
    category: "deduction",
    type: "percent",
    amount: 8,
    textValue: "",
    required: true,
    departmentIds: [],
    note: "",
  },
  {
    label: "Social Security",
    category: "deduction",
    type: "percent",
    amount: 5,
    textValue: "",
    required: true,
    departmentIds: [],
    note: "",
  },
  {
    label: "Bank Account",
    category: "info",
    type: "text",
    amount: 0,
    textValue: "•••• 0000",
    required: true,
    departmentIds: [],
    note: "",
  },
];

const FIELD_SETS: Record<string, FieldSeed[]> = {
  c_acme: acmeFields,
  c_globex: globexFields,
  c_northwind: northwindFields,
  c_sunrise: sunriseFields,
};

function buildFields(): PayField[] {
  const out: PayField[] = [];
  for (const client of clients) {
    out.push(baseField(client.id));
    FIELD_SETS[client.id].forEach((f, i) => {
      out.push({
        ...f,
        id: `f_${client.id.slice(2)}_${i}`,
        clientId: client.id,
        order: i + 1,
      });
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Students & fee payment history (school clients)                     */
/* ------------------------------------------------------------------ */

type StudentSeed = [
  name: string,
  className: string,
  monthlyFee: number,
  currentStatus: FeeStatus,
  currentAmountPaid: number,
];

const sunriseStudents: StudentSeed[] = [
  ["Kwabena Mensah", "Grade 5", 120, "paid", 120],
  ["Abena Owusu", "Grade 5", 120, "paid", 120],
  ["Yaw Boateng", "Grade 5", 120, "unpaid", 0],
  ["Akosua Frimpong", "Grade 4", 110, "paid", 110],
  ["Kojo Antwi", "Grade 4", 110, "partial", 60],
  ["Ama Sarpong", "Grade 4", 110, "social_case", 0],
  ["Kwesi Danso", "Grade 3", 100, "paid", 100],
  ["Efua Asare", "Grade 3", 100, "unpaid", 0],
  ["Kofi Amankwah", "Grade 2", 95, "paid", 95],
  ["Adjoa Nyarko", "Grade 2", 95, "partial", 40],
  ["Kwame Otieno", "Grade 1", 90, "paid", 90],
  ["Abla Quaye", "Grade 1", 90, "unpaid", 0],
];

function buildStudents(): Student[] {
  return sunriseStudents.map((s, i) => {
    const [name, className, monthlyFee] = s;
    return {
      id: `st_sunrise_${i}`,
      clientId: "c_sunrise",
      name,
      cycle: "primaire",
      className,
      guardianContact: `+233 24 ${String(100 + i).padStart(3, "0")} ${String(1000 + i * 11).slice(-4)}`,
      monthlyFee,
      status: "active",
      joinDate: `2022-09-0${(i % 9) + 1}`,
      note: "",
    };
  });
}

/**
 * Builds four months of fee-payment history per student: the three months
 * before `currentPeriod` are seeded as paid in full (a clean track record),
 * and `currentPeriod` itself uses each student's seeded current status —
 * this is what makes month-to-month collection trends visible right away.
 */
function buildFeePayments(currentPeriod: string): FeePayment[] {
  const out: FeePayment[] = [];

  sunriseStudents.forEach((s, i) => {
    const [, , monthlyFee, currentStatus, currentAmountPaid] = s;
    const studentId = `st_sunrise_${i}`;

    for (let back = 3; back >= 1; back--) {
      const period = shiftPeriod(currentPeriod, -back);
      out.push({
        id: `fp_sunrise_${i}_${period}`,
        clientId: "c_sunrise",
        studentId,
        period,
        amountDue: monthlyFee,
        amountPaid: monthlyFee,
        status: "paid",
        paidAt: new Date(`${period}-27T10:00:00`).toISOString(),
        note: "",
      });
    }

    out.push({
      id: `fp_sunrise_${i}_${currentPeriod}`,
      clientId: "c_sunrise",
      studentId,
      period: currentPeriod,
      amountDue: monthlyFee,
      amountPaid: currentAmountPaid,
      status: currentStatus,
      paidAt:
        currentAmountPaid > 0
          ? new Date(Date.now() - i * 86_400_000).toISOString()
          : null,
      note: "",
    });
  });

  return out;
}

type ExpenseSeed = [category: Expense["category"], description: string, amount: number, daysAgo: number];

const sunriseExpenses: ExpenseSeed[] = [
  ["fuel", "Generator fuel — monthly top-up", 85, 4],
  ["renovation", "Repair of Grade 3 classroom roof", 620, 12],
  ["supplies", "Exercise books and chalk restock", 140, 6],
  ["utilities", "Electricity bill — August", 210, 9],
  ["credit", "Supplier credit repayment — furniture", 300, 20],
  ["maintenance", "Plumbing repair — staff restroom", 95, 15],
];

function buildExpenses(): Expense[] {
  return sunriseExpenses.map((e, i) => {
    const [category, description, amount, daysAgo] = e;
    const date = new Date(Date.now() - daysAgo * 86_400_000);
    return {
      id: `ex_sunrise_${i}`,
      clientId: "c_sunrise",
      category,
      description,
      amount,
      date: date.toISOString().slice(0, 10),
      submittedBy: "Ruth Adjei",
      createdAt: date.toISOString(),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Intendance / supplies (school clients) — Bonté Service delivers,     */
/* the school only ever sells and counts, never buys.                  */
/* ------------------------------------------------------------------ */

type DeliverySeed = [
  category: SupplyCategory,
  itemLabel: string,
  quantity: number,
  daysAgo: number,
  reference: string,
];

const sunriseDeliveries: DeliverySeed[] = [
  ["uniform", "Uniform — Size S", 30, 45, "BS-2024-014"],
  ["uniform", "Uniform — Size M", 40, 45, "BS-2024-014"],
  ["shoes", "Shoes — Size 36", 20, 30, "BS-2024-021"],
  ["sweater", "Sweater — Size M", 25, 30, "BS-2024-021"],
];

type SaleSeed = [
  category: SupplyCategory,
  itemLabel: string,
  quantity: number,
  unitPrice: number,
  buyerName: string,
  daysAgo: number,
];

const sunriseSales: SaleSeed[] = [
  ["uniform", "Uniform — Size S", 5, 25, "Guardian of Kwabena Mensah", 40],
  ["uniform", "Uniform — Size S", 7, 25, "Guardian of Abena Owusu", 22],
  ["uniform", "Uniform — Size M", 10, 25, "Guardian of Akosua Frimpong", 38],
  ["uniform", "Uniform — Size M", 8, 25, "Guardian of Kojo Antwi", 15],
  ["shoes", "Shoes — Size 36", 9, 30, "Guardian of Kwesi Danso", 20],
  ["sweater", "Sweater — Size M", 10, 15, "Guardian of Efua Asare", 18],
];

// The shoes count comes in 3 short of what deliveries-minus-sales predicts —
// exactly the kind of gap between the schools and Bonté Service the client
// asked this module to surface.
type CountSeed = [
  category: SupplyCategory,
  itemLabel: string,
  countedQty: number,
  daysAgo: number,
];

const sunriseCounts: CountSeed[] = [
  ["uniform", "Uniform — Size S", 18, 5],
  ["uniform", "Uniform — Size M", 22, 5],
  ["shoes", "Shoes — Size 36", 8, 5],
  ["sweater", "Sweater — Size M", 15, 5],
];

function daysAgoIso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

function buildSupplyDeliveries(): SupplyDelivery[] {
  return sunriseDeliveries.map(([category, itemLabel, quantity, daysAgo, reference], i) => ({
    id: `sd_sunrise_${i}`,
    clientId: "c_sunrise",
    category,
    itemLabel,
    quantity,
    deliveredAt: daysAgoIso(daysAgo).slice(0, 10),
    reference,
    recordedBy: "Bonté Service",
    createdAt: daysAgoIso(daysAgo),
  }));
}

function buildSupplySales(): SupplySale[] {
  return sunriseSales.map(([category, itemLabel, quantity, unitPrice, buyerName, daysAgo], i) => ({
    id: `ss_sunrise_${i}`,
    clientId: "c_sunrise",
    category,
    itemLabel,
    quantity,
    unitPrice,
    totalAmount: quantity * unitPrice,
    buyerName,
    soldAt: daysAgoIso(daysAgo).slice(0, 10),
    recordedBy: "Ruth Adjei",
    createdAt: daysAgoIso(daysAgo),
  }));
}

function buildSupplyInventoryCounts(): SupplyInventoryCount[] {
  return sunriseCounts.map(([category, itemLabel, countedQty, daysAgo], i) => {
    const delivered = sunriseDeliveries
      .filter((d) => d[0] === category && d[1] === itemLabel)
      .reduce((sum, d) => sum + d[2], 0);
    const sold = sunriseSales
      .filter((s) => s[0] === category && s[1] === itemLabel)
      .reduce((sum, s) => sum + s[2], 0);
    const expectedQty = delivered - sold;
    return {
      id: `sic_sunrise_${i}`,
      clientId: "c_sunrise",
      category,
      itemLabel,
      countedQty,
      expectedQty,
      variance: countedQty - expectedQty,
      countedAt: daysAgoIso(daysAgo).slice(0, 10),
      countedBy: "Ruth Adjei",
      note: "",
      createdAt: daysAgoIso(daysAgo),
    };
  });
}

/* ------------------------------------------------------------------ */

export const templates: Templates = {
  emailSubject: "Your {{period}} payslip from {{client}}",
  emailBody: `Hi {{first_name}},

Your payslip for {{period}} is ready. Your net pay of {{net_pay}} will reach your account on {{pay_date}}.

A full breakdown is attached as a PDF. If anything looks off, reply to this email and we'll sort it out.

— Payroll, {{client}}`,
  whatsappBody: `*{{client}} Payroll*

Hi {{first_name}}, your {{period}} payslip is ready.

Net pay: *{{net_pay}}*
Pay date: {{pay_date}}

Tap below to view your full breakdown.`,
};

/* ------------------------------------------------------------------ */

export function buildInitialState(): PayrollState {
  const { departments, employees } = buildOrg();
  const now = new Date();
  const period = toPeriod(now);
  return {
    clients,
    activeClientId: "c_acme",
    departments,
    employees,
    fields: buildFields(),
    payslips: [],
    students: buildStudents(),
    feePayments: buildFeePayments(period),
    expenses: buildExpenses(),
    requisitions: [],
    supplyDeliveries: buildSupplyDeliveries(),
    supplySales: buildSupplySales(),
    supplyInventoryCounts: buildSupplyInventoryCounts(),
    logs: [],
    templates,
    period,
  };
}
