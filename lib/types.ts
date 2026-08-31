export type ID = string;

export type Currency = "USD" | "NGN" | "GBP" | "EUR" | "KES" | "ZAR" | "GHS" | "CDF" | "XAF";

export interface Client {
  id: ID;
  name: string;
  domain: string;
  description: string;
  color: string; // hsl token key: pine | gold | olive | clay | pine-deep | pine-mid
  currency: Currency;
  payDay: number; // day of month
  createdAt: string;
  /** Soft-delete marker — set instead of removing the record outright. Absent/null = active. */
  deletedAt?: string | null;
}

export interface Department {
  id: ID;
  clientId: ID;
  name: string;
  description: string;
  headId: ID | null;
  color: string;
}

export type EmployeeStatus = "active" | "leave" | "inactive";
export type Channel = "email" | "whatsapp";

export interface Employee {
  id: ID;
  clientId: ID;
  departmentId: ID;
  code: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  baseSalary: number;
  status: EmployeeStatus;
  joinDate: string;
  channels: Channel[];
  /** Per-employee overrides / values keyed by field id */
  values: Record<ID, string | number>;
  /** Soft-delete marker — set instead of removing the record outright. Absent/null = active. */
  deletedAt?: string | null;
}

export type FieldCategory = "earning" | "deduction" | "info";
/**
 * fixed    – flat amount
 * percent  – % of base salary (earnings) or % of gross (deductions)
 * perEmployee – amount entered individually on each employee record
 * text     – informational text shown on the payslip
 */
export type FieldType = "fixed" | "percent" | "perEmployee" | "text";

export interface PayField {
  id: ID;
  clientId: ID;
  label: string;
  category: FieldCategory;
  type: FieldType;
  amount: number;
  textValue: string;
  required: boolean;
  /** empty array === applies to every department */
  departmentIds: ID[];
  order: number;
  note: string;
  system?: boolean; // Basic Salary — cannot be deleted
}

export interface PayslipLine {
  fieldId: ID;
  label: string;
  category: FieldCategory;
  amount: number;
  display: string; // e.g. "10% of gross"
  text?: string;
}

export type PayslipStatus = "draft" | "sent" | "partial" | "failed";
export type DeliveryState = "pending" | "queued" | "sending" | "sent" | "failed";

export interface DeliveryRecord {
  state: DeliveryState;
  at: string | null;
  error?: string;
}

export interface Payslip {
  id: ID;
  clientId: ID;
  employeeId: ID;
  period: string; // YYYY-MM
  lines: PayslipLine[];
  gross: number;
  totalDeductions: number;
  net: number;
  status: PayslipStatus;
  generatedAt: string;
  delivery: Partial<Record<Channel, DeliveryRecord>>;
}

export type StudentStatus = "active" | "withdrawn";
export type FeeStatus = "paid" | "partial" | "unpaid" | "social_case";

/**
 * The three cycles a student is enrolled through, per the client's
 * structure: Primaire → Cycle d'orientation → Cycle supérieur (Humanités).
 * `className` remains the specific class within that cycle (e.g. "6ème
 * Primaire"), so filtering/reporting can group by cycle without parsing text.
 */
export type Cycle = "primaire" | "orientation" | "superieur";

export interface Student {
  id: ID;
  clientId: ID; // which school
  name: string;
  cycle: Cycle;
  className: string; // e.g. "Grade 5", "CM2", "6ème Primaire"
  guardianContact: string;
  guardianEmail?: string;
  monthlyFee: number;
  status: StudentStatus;
  joinDate: string;
  note: string;
  /** Soft-delete marker — set instead of removing the record outright. Absent/null = active. */
  deletedAt?: string | null;
}

/** One student's fee position for one period — the month-to-month ledger. */
export interface FeePayment {
  id: ID;
  clientId: ID;
  studentId: ID;
  period: string; // YYYY-MM
  amountDue: number; // snapshot of the student's monthly fee when this record was created
  amountPaid: number;
  status: FeeStatus;
  paidAt: string | null;
  note: string;
}

export type ExpenseCategory =
  | "fuel"
  | "credit"
  | "renovation"
  | "supplies"
  | "utilities"
  | "maintenance"
  | "other";

export interface Expense {
  id: ID;
  clientId: ID;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  submittedBy: string; // display name of whoever logged it
  createdAt: string;
}

/** Who performed a logged action — omitted for system-generated entries. */
export interface LogActor {
  id: ID;
  name: string;
  role: Role;
}

export interface LogEntry {
  id: ID;
  clientId: ID;
  at: string;
  kind:
    | "generate"
    | "send"
    | "employee"
    | "department"
    | "field"
    | "client"
    | "fail"
    | "student"
    | "payment"
    | "expense"
    | "team"
    | "requisition"
    | "supply";
  message: string;
  meta?: string;
  /** Who did this. Absent on older/system entries recorded before this field existed. */
  actor?: LogActor | null;
  /** True for actions worth calling out in a filtered "sensitive" audit view (deletes, payslip/financial changes). */
  sensitive?: boolean;
}

export interface Templates {
  emailSubject: string;
  emailBody: string;
  whatsappBody: string;
}

/* --------------------------- Treasury / Bonté Service -------------------------- */

/**
 * "fund_request" — a school asking Treasury for money for some need (a bon
 * de commande). "payroll" — a school (or Treasury itself) requesting the
 * funds to cover one period's salaries; same lifecycle, just labeled
 * separately so reports can break the two apart.
 */
export type RequisitionCategory = "fund_request" | "payroll";

/**
 * pending → (approved | rejected) → paid. Rejection is terminal; only an
 * approved requisition can be marked paid. This is deliberately a strict
 * one-way pipeline — Treasury is the fraud-control point the client cares
 * about most, so every step is logged and nothing skips a stage.
 */
export type RequisitionStatus = "pending" | "approved" | "rejected" | "paid";

export interface Requisition {
  id: ID;
  clientId: ID; // which school this is for
  category: RequisitionCategory;
  description: string;
  amountRequested: number;
  /** Relevant for category "payroll" — which pay period this covers. */
  period?: string;
  status: RequisitionStatus;
  submittedBy: string; // display name of whoever submitted it
  /** Account id of whoever submitted it, so a decision can notify them directly. Absent on older rows recorded before this field existed. */
  submittedByUserId?: ID;
  submittedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
  paidAmount?: number;
  paidAt?: string;
  paymentMethod?: string;
}

/* --------------------- Intendance / supplies logistics -------------------- */

/** What the promoter's logistics department stocks and sells to students. */
export type SupplyCategory = "uniform" | "shoes" | "sweater" | "other";

/**
 * Intendance never buys — Bonté Service always assures delivery of what's to
 * be sold, so a delivery is only ever recorded from the Treasury/Bonté
 * Service side, pushed to one school. This is the only way stock enters a
 * school; Intendance's own actions (below) can only sell it back out or
 * count what's physically there.
 */
export interface SupplyDelivery {
  id: ID;
  clientId: ID; // destination school
  category: SupplyCategory;
  itemLabel: string; // e.g. "Uniform — size M", "Shoes — size 38"
  quantity: number;
  deliveredAt: string; // YYYY-MM-DD
  reference: string; // Bonté Service delivery note / bordereau number
  recordedBy: string;
  createdAt: string;
}

/** A sale made by Intendance to a student/guardian. */
export interface SupplySale {
  id: ID;
  clientId: ID;
  category: SupplyCategory;
  itemLabel: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  buyerName: string; // student or guardian name
  soldAt: string; // YYYY-MM-DD
  recordedBy: string;
  createdAt: string;
}

/**
 * A periodic physical count. `expectedQty` is the system-computed stock
 * (deliveries − sales) snapshotted at count time; it is never silently
 * corrected by a count — the variance is the anti-theft signal the client
 * specifically asked for, so it's logged and stays visible either way.
 */
export interface SupplyInventoryCount {
  id: ID;
  clientId: ID;
  category: SupplyCategory;
  itemLabel: string;
  countedQty: number;
  expectedQty: number;
  variance: number; // countedQty - expectedQty
  countedAt: string; // YYYY-MM-DD
  countedBy: string;
  note: string;
  createdAt: string;
}

export interface PayrollState {
  clients: Client[];
  activeClientId: ID;
  departments: Department[];
  employees: Employee[];
  fields: PayField[];
  payslips: Payslip[];
  students: Student[];
  feePayments: FeePayment[];
  expenses: Expense[];
  requisitions: Requisition[];
  supplyDeliveries: SupplyDelivery[];
  supplySales: SupplySale[];
  supplyInventoryCounts: SupplyInventoryCount[];
  logs: LogEntry[];
  templates: Templates;
  period: string;
}

/* -------------------------- roles & accounts -------------------------- */

export type Role =
  | "super_admin"
  | "promoter"
  | "school_admin"
  | "teacher"
  | "finance"
  /** Bonté Service / Treasury — org-wide, not scoped to one school. Collects every
   *  school's fee income and is the only place disbursements (salaries, approved
   *  fund requests) actually get paid out from. */
  | "treasury"
  /** The only role that can actually enroll students and change fee status on
   *  collection — "school_admin" is read-only plus requisitions (see below). */
  | "cashier"
  /** Supplies/uniforms stock in one school: intake, transfers, inventory counts. */
  | "intendance";

/* ------------------------------- audit trail ------------------------------ */

export type AuditAction =
  | "delete"
  | "restore"
  | "purge"
  | "update"
  | "generate"
  | "clear"
  | "deliver";

export type AuditEntityType = "employee" | "student" | "client" | "payslip" | "expense";

export interface AuditLogEntry {
  id: ID;
  orgOwnerId: ID;
  clientId: ID | null;
  actorId: ID;
  actorName: string;
  actorRole: Role;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: ID;
  entityLabel: string;
  details?: string;
  at: string;
}

/* --------------------------- in-app notifications --------------------------- */

export type NotificationType =
  | "requisition_submitted"
  | "requisition_approved"
  | "requisition_rejected"
  | "requisition_paid"
  | "team_invited"
  | "payslip_sent"
  | "payslip_failed"
  | "fee_reminder_sent"
  | "fee_reminder_failed";

/**
 * One row per recipient account — a notification fanned out to five people
 * (e.g. Treasury on a new requisition) is five rows, each with its own
 * `read` state, rather than one row with a list of readers. Simpler to
 * query ("my unread count") at the cost of some duplication, which is fine
 * at this volume.
 */
export interface Notification {
  id: ID;
  orgOwnerId: ID;
  /** Which account this row is for. */
  userId: ID;
  /** School this relates to, if any — absent for org-wide events (e.g. a new team invite). */
  clientId: ID | null;
  type: NotificationType;
  title: string;
  message: string;
  /** Where clicking the notification should take the user, e.g. "/portal". */
  link?: string;
  read: boolean;
  createdAt: string;
}

/** What a non-super_admin account is scoped to. */
export interface AccountScope {
  role: Role;
  /** Owner of the shared workspace this account reads from. */
  orgOwnerId: ID;
  /** Which school (Client) this account is limited to — absent for "promoter" and "treasury", who see all. */
  clientId: ID | null;
  /** For "teacher" only — which Employee record is "them". */
  employeeId: ID | null;
}
