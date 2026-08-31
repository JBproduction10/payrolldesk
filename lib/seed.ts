// lib/seed.ts
import type {
  Client,
  Department,
  Employee,
  Expense,
  FeePayment,
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
    id: "c_cedres",
    name: "Groupe Scolaire Les Cèdres",
    domain: "cedres.edu",
    description: "Primaire — Yaoundé",
    color: "pine-mid",
    currency: "CDF",
    payDay: 28,
    createdAt: "2015-09-01",
  },
  {
    id: "c_fontaine",
    name: "Complexe Scolaire La Fontaine",
    domain: "fontaine.edu",
    description: "Secondaire — Douala",
    color: "gold",
    currency: "CDF",
    payDay: 27,
    createdAt: "2012-09-01",
  },
  {
    id: "c_excellence",
    name: "Institut Bilingue Excellence",
    domain: "excellence.edu",
    description: "Bilingue — Bafoussam",
    color: "olive",
    currency: "USD",
    payDay: 30,
    createdAt: "2018-09-01",
  },
  {
    id: "c_horizon",
    name: "École Nouvelle Horizon",
    domain: "horizon.edu",
    description: "Maternelle & Primaire — Bertoua",
    color: "clay",
    currency: "CDF",
    payDay: 25,
    createdAt: "2020-09-01",
  },
  {
    id: "c_saintmichel",
    name: "Académie Saint-Michel",
    domain: "saintmichel.edu",
    description: "Primaire — nouvelle école, 1ère rentrée",
    color: "pine-deep",
    currency: "USD",
    payDay: 28,
    createdAt: "2026-01-12",
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

const cedresDepts: DeptSeed[] = [
  {
    key: "enseignants",
    name: "Enseignants",
    description: "Corps enseignant du primaire",
    staff: [
      ["Jean-Paul Ateba", "Enseignant CM2", 600000],
      ["Solange Mbarga", "Enseignante CM1", 575000],
      ["Étienne Nkolo", "Enseignant CE2", 550000],
      ["Brigitte Talla", "Enseignante CE1", 550000],
      ["Roger Ondoa", "Enseignant CP", 525000],
    ],
  },
  {
    key: "administration",
    name: "Administration",
    description: "Direction et gestion administrative",
    staff: [
      ["Marceline Fotso", "Directrice", 1250000],
      ["Vivien Essomba", "Surveillant général", 475000],
      ["Chantal Biya", "Secrétaire", 425000],
    ],
  },
  {
    key: "appui",
    name: "Personnel d'appui",
    description: "Gardiennage et entretien",
    staff: [["Paul Mvondo", "Gardien", 300000]],
  },
];

const fontaineDepts: DeptSeed[] = [
  {
    key: "enseignants",
    name: "Enseignants",
    description: "Corps enseignant du secondaire",
    staff: [
      ["Adèle Ngassa", "Enseignante 6ème", 650000],
      ["Bertrand Nana", "Enseignant 5ème", 640000],
      ["Clarisse Wandji", "Enseignante 4ème", 625000],
      ["Désiré Fokou", "Enseignant 3ème", 625000],
    ],
  },
  {
    key: "administration",
    name: "Administration",
    description: "Direction, censorat et comptabilité",
    staff: [
      ["Hervé Djoumessi", "Directeur", 1200000],
      ["Amina Sali", "Censeur", 550000],
      ["Rodrigue Tchinda", "Comptable", 500000],
    ],
  },
  {
    key: "appui",
    name: "Personnel d'appui",
    description: "Entretien et logistique",
    staff: [["Josiane Nkeng", "Agent d'entretien", 275000]],
  },
];

const excellenceDepts: DeptSeed[] = [
  {
    key: "enseignants",
    name: "Enseignants",
    description: "Corps enseignant bilingue",
    staff: [
      ["Mark Johnson", "English Teacher", 225],
      ["Sylvie Nguema", "Enseignante Français", 210],
      ["David Etoundi", "Enseignant Mathématiques", 215],
      ["Pauline Assiga", "Enseignante Sciences", 205],
    ],
  },
  {
    key: "administration",
    name: "Administration",
    description: "Direction et économat",
    staff: [
      ["Rose Ateba", "Directrice", 385],
      ["Bruno Kenfack", "Économe", 175],
    ],
  },
  {
    key: "appui",
    name: "Personnel d'appui",
    description: "Bibliothèque et transport",
    staff: [
      ["Alice Menye", "Bibliothécaire", 115],
      ["Guy Larue", "Chauffeur", 110],
    ],
  },
];

const horizonDepts: DeptSeed[] = [
  {
    key: "enseignants",
    name: "Enseignants",
    description: "Corps enseignant",
    staff: [
      ["Larissa Ekani", "Enseignante Maternelle", 475000],
      ["Yannick Bella", "Enseignant CP", 500000],
      ["Odette Fouda", "Enseignante CE1", 500000],
    ],
  },
  {
    key: "administration",
    name: "Administration",
    description: "Direction et surveillance",
    staff: [
      ["Théophile Mbassi", "Directeur", 1000000],
      ["Simon Abega", "Surveillant", 375000],
    ],
  },
  {
    key: "appui",
    name: "Personnel d'appui",
    description: "Gardiennage",
    staff: [["Delphine Ntolo", "Gardienne", 275000]],
  },
];

const saintmichelDepts: DeptSeed[] = [
  {
    key: "enseignants",
    name: "Enseignants",
    description: "Corps enseignant",
    staff: [
      ["Judith Ebode", "Enseignante CI", 150],
      ["François Ella", "Enseignant CP", 150],
    ],
  },
  {
    key: "administration",
    name: "Administration",
    description: "Direction",
    staff: [["Anicet Owona", "Directeur", 315]],
  },
  {
    key: "appui",
    name: "Personnel d'appui",
    description: "Gardiennage",
    staff: [["Régine Assam", "Gardienne", 85]],
  },
];

const DEPT_SETS: Record<string, DeptSeed[]> = {
  c_cedres: cedresDepts,
  c_fontaine: fontaineDepts,
  c_excellence: excellenceDepts,
  c_horizon: horizonDepts,
  c_saintmichel: saintmichelDepts,
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

const schoolDeductionFields: FieldSeed[] = [
  {
    label: "IRPP",
    category: "deduction",
    type: "percent",
    amount: 8,
    textValue: "",
    required: true,
    departmentIds: [],
    note: "Impôt sur le revenu des personnes physiques",
  },
  {
    label: "CNPS",
    category: "deduction",
    type: "percent",
    amount: 4,
    textValue: "",
    required: true,
    departmentIds: [],
    note: "Caisse nationale de prévoyance sociale",
  },
  {
    label: "Compte bancaire",
    category: "info",
    type: "text",
    amount: 0,
    textValue: "•••• 0000",
    required: true,
    departmentIds: [],
    note: "",
  },
  {
    label: "N° CNPS",
    category: "info",
    type: "text",
    amount: 0,
    textValue: "",
    required: true,
    departmentIds: [],
    note: "",
  },
];

// Fixed-amount allowances are denominated per client currency, so schools
// billing in CDF and schools billing in USD each get their own amounts.
const schoolFieldsCDF: FieldSeed[] = [
  {
    label: "Prime de logement",
    category: "earning",
    type: "fixed",
    amount: 75000,
    textValue: "",
    required: false,
    departmentIds: [],
    note: "",
  },
  {
    label: "Prime de transport",
    category: "earning",
    type: "fixed",
    amount: 50000,
    textValue: "",
    required: false,
    departmentIds: [],
    note: "",
  },
  ...schoolDeductionFields,
];

const schoolFieldsUSD: FieldSeed[] = [
  {
    label: "Prime de logement",
    category: "earning",
    type: "fixed",
    amount: 25,
    textValue: "",
    required: false,
    departmentIds: [],
    note: "",
  },
  {
    label: "Prime de transport",
    category: "earning",
    type: "fixed",
    amount: 15,
    textValue: "",
    required: false,
    departmentIds: [],
    note: "",
  },
  ...schoolDeductionFields,
];

const FIELD_SETS: Record<string, FieldSeed[]> = {
  c_cedres: schoolFieldsCDF,
  c_fontaine: schoolFieldsCDF,
  c_excellence: schoolFieldsUSD,
  c_horizon: schoolFieldsCDF,
  c_saintmichel: schoolFieldsUSD,
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

/** One period's outcome for a student's fee ledger, collapsed to a single amountDue/amountPaid/status record (payrolldesk aggregates a period into one FeePayment row, unlike a running per-transaction ledger). */
type FeeEntry =
  | { type: "full" }
  | { type: "partial"; amount: number }
  | { type: "none" }
  | { type: "installments"; amounts: number[] }
  | { type: "social_case"; amountDue?: number };

type SchoolStudentSeed = {
  name: string;
  className: string;
  monthlyFee: number;
  guardianName: string;
  guardianPhone: string; // Cameroon-style 9-digit local number, no country code
  /** The period before `currentPeriod` — undefined means this school has no record for it (e.g. a school that only started tracking fees this month). */
  prior?: FeeEntry;
  current: FeeEntry;
};

type SchoolSeed = {
  clientId: string;
  slug: string;
  cycle: "primaire" | "orientation";
  joinYear: string; // e.g. "2025-09" — students are seeded as having joined near the start of the current school year
  students: SchoolStudentSeed[];
};

const cedresStudents: SchoolStudentSeed[] = [
  { name: "Aristide Fouda", className: "CM2", monthlyFee: 125000, guardianName: "Mme Fouda", guardianPhone: "699000001", prior: { type: "full" }, current: { type: "full" } },
  { name: "Line Ngo Bikoi", className: "CM2", monthlyFee: 125000, guardianName: "M. Bikoi", guardianPhone: "699000002", prior: { type: "full" }, current: { type: "full" } },
  { name: "Cyrille Amougou", className: "CM1", monthlyFee: 125000, guardianName: "Mme Amougou", guardianPhone: "699000003", prior: { type: "full" }, current: { type: "partial", amount: 75000 } },
  { name: "Rebecca Same", className: "CM1", monthlyFee: 125000, guardianName: "M. Same", guardianPhone: "699000004", prior: { type: "full" }, current: { type: "full" } },
  { name: "Josué Belinga", className: "CE2", monthlyFee: 110000, guardianName: "Mme Belinga", guardianPhone: "699000005", prior: { type: "partial", amount: 60000 }, current: { type: "full" } },
  { name: "Grace Owona", className: "CE2", monthlyFee: 110000, guardianName: "M. Owona", guardianPhone: "699000006", prior: { type: "full" }, current: { type: "none" } },
  { name: "Franck Mbella", className: "CE1", monthlyFee: 110000, guardianName: "Mme Mbella", guardianPhone: "699000007", prior: { type: "full" }, current: { type: "full" } },
  { name: "Nadège Essola", className: "CE1", monthlyFee: 110000, guardianName: "M. Essola", guardianPhone: "699000008", prior: { type: "social_case" }, current: { type: "social_case" } },
  { name: "Yvan Ndzana", className: "CP", monthlyFee: 100000, guardianName: "Mme Ndzana", guardianPhone: "699000009", prior: { type: "full" }, current: { type: "full" } },
  { name: "Perle Onana", className: "CP", monthlyFee: 100000, guardianName: "M. Onana", guardianPhone: "699000010", prior: { type: "none" }, current: { type: "installments", amounts: [30000, 20000] } },
  { name: "Blaise Enow", className: "CM2", monthlyFee: 125000, guardianName: "Mme Enow", guardianPhone: "699000011", prior: { type: "full" }, current: { type: "full" } },
  { name: "Odile Kamga", className: "CM1", monthlyFee: 125000, guardianName: "M. Kamga", guardianPhone: "699000012", prior: { type: "full" }, current: { type: "full" } },
];

const fontaineStudents: SchoolStudentSeed[] = [
  { name: "Kevin Fotso Jr", className: "6ème", monthlyFee: 150000, guardianName: "Mme Fotso", guardianPhone: "677000001", prior: { type: "full" }, current: { type: "full" } },
  { name: "Sandra Meka", className: "6ème", monthlyFee: 150000, guardianName: "M. Meka", guardianPhone: "677000002", prior: { type: "full" }, current: { type: "none" } },
  { name: "Willy Ebogo", className: "5ème", monthlyFee: 150000, guardianName: "Mme Ebogo", guardianPhone: "677000003", prior: { type: "installments", amounts: [50000, 25000] }, current: { type: "partial", amount: 75000 } },
  { name: "Carine Nyanga", className: "5ème", monthlyFee: 150000, guardianName: "M. Nyanga", guardianPhone: "677000004", prior: { type: "full" }, current: { type: "full" } },
  { name: "Steve Abanda", className: "4ème", monthlyFee: 160000, guardianName: "Mme Abanda", guardianPhone: "677000005", prior: { type: "none" }, current: { type: "none" } },
  { name: "Flore Manga", className: "4ème", monthlyFee: 160000, guardianName: "M. Manga", guardianPhone: "677000006", prior: { type: "full" }, current: { type: "full" } },
  { name: "Landry Njoya", className: "3ème", monthlyFee: 160000, guardianName: "Mme Njoya", guardianPhone: "677000007", prior: { type: "social_case" }, current: { type: "social_case" } },
  { name: "Aurelie Bikele", className: "3ème", monthlyFee: 160000, guardianName: "M. Bikele", guardianPhone: "677000008", prior: { type: "full" }, current: { type: "partial", amount: 100000 } },
  { name: "Patrick Zang", className: "6ème", monthlyFee: 150000, guardianName: "Mme Zang", guardianPhone: "677000009", prior: { type: "full" }, current: { type: "full" } },
  { name: "Diane Oyono", className: "5ème", monthlyFee: 150000, guardianName: "M. Oyono", guardianPhone: "677000010", prior: { type: "full" }, current: { type: "full" } },
];

const excellenceStudents: SchoolStudentSeed[] = [
  { name: "Ryan Foka", className: "5ème Bilingue", monthlyFee: 65, guardianName: "Mme Foka", guardianPhone: "655000001", current: { type: "full" } },
  { name: "Tania Ekwalla", className: "5ème Bilingue", monthlyFee: 65, guardianName: "M. Ekwalla", guardianPhone: "655000002", current: { type: "full" } },
  { name: "Chris Etame", className: "4ème Bilingue", monthlyFee: 65, guardianName: "Mme Etame", guardianPhone: "655000003", current: { type: "partial", amount: 35 } },
  { name: "Melissa Njoh", className: "4ème Bilingue", monthlyFee: 65, guardianName: "M. Njoh", guardianPhone: "655000004", current: { type: "full" } },
  { name: "Boris Fongang", className: "3ème Bilingue", monthlyFee: 70, guardianName: "Mme Fongang", guardianPhone: "655000005", current: { type: "full" } },
  { name: "Nina Ateba", className: "3ème Bilingue", monthlyFee: 70, guardianName: "M. Ateba", guardianPhone: "655000006", current: { type: "none" } },
  { name: "Éric Talom", className: "6ème Bilingue", monthlyFee: 65, guardianName: "Mme Talom", guardianPhone: "655000007", current: { type: "full" } },
  { name: "Sarah Mbia", className: "6ème Bilingue", monthlyFee: 65, guardianName: "M. Mbia", guardianPhone: "655000008", current: { type: "full" } },
  { name: "Junior Awono", className: "5ème Bilingue", monthlyFee: 65, guardianName: "Mme Awono", guardianPhone: "655000009", current: { type: "social_case" } },
  { name: "Priscille Doumbe", className: "4ème Bilingue", monthlyFee: 65, guardianName: "M. Doumbe", guardianPhone: "655000010", current: { type: "full" } },
  { name: "Alex Ngo", className: "3ème Bilingue", monthlyFee: 70, guardianName: "Mme Ngo", guardianPhone: "655000011", current: { type: "partial", amount: 40 } },
  { name: "Vanessa Kotto", className: "6ème Bilingue", monthlyFee: 65, guardianName: "M. Kotto", guardianPhone: "655000012", current: { type: "full" } },
  { name: "Cedric Ossome", className: "5ème Bilingue", monthlyFee: 65, guardianName: "Mme Ossome", guardianPhone: "655000013", current: { type: "none" } },
];

const horizonStudents: SchoolStudentSeed[] = [
  { name: "Emma Nkodo", className: "Maternelle", monthlyFee: 90000, guardianName: "Mme Nkodo", guardianPhone: "690000001", current: { type: "full" } },
  { name: "Noah Biloa", className: "Maternelle", monthlyFee: 90000, guardianName: "M. Biloa", guardianPhone: "690000002", current: { type: "full" } },
  { name: "Chloé Essiane", className: "CP", monthlyFee: 95000, guardianName: "Mme Essiane", guardianPhone: "690000003", current: { type: "partial", amount: 50000 } },
  { name: "Liam Owoundi", className: "CP", monthlyFee: 95000, guardianName: "M. Owoundi", guardianPhone: "690000004", current: { type: "full" } },
  { name: "Léa Mengue", className: "CE1", monthlyFee: 100000, guardianName: "Mme Mengue", guardianPhone: "690000005", current: { type: "none" } },
  { name: "Nathan Bikoro", className: "CE1", monthlyFee: 100000, guardianName: "M. Bikoro", guardianPhone: "690000006", current: { type: "social_case" } },
  { name: "Inès Ekomo", className: "Maternelle", monthlyFee: 90000, guardianName: "Mme Ekomo", guardianPhone: "690000007", current: { type: "full" } },
  { name: "Théo Ndongo", className: "CP", monthlyFee: 95000, guardianName: "M. Ndongo", guardianPhone: "690000008", current: { type: "full" } },
];

const saintmichelStudents: SchoolStudentSeed[] = [
  { name: "Divine Ateba", className: "CI", monthlyFee: 30, guardianName: "Mme Ateba", guardianPhone: "696000001", current: { type: "full" } },
  { name: "Prince Nnomo", className: "CI", monthlyFee: 30, guardianName: "M. Nnomo", guardianPhone: "696000002", current: { type: "none" } },
  { name: "Merveille Onana", className: "CP", monthlyFee: 30, guardianName: "Mme Onana", guardianPhone: "696000003", current: { type: "full" } },
  { name: "Israël Mbarga", className: "CP", monthlyFee: 30, guardianName: "M. Mbarga", guardianPhone: "696000004", current: { type: "partial", amount: 15 } },
  { name: "Gaëlle Fouda", className: "CI", monthlyFee: 30, guardianName: "Mme Fouda", guardianPhone: "696000005", current: { type: "social_case" } },
  { name: "Elvis Ngo", className: "CP", monthlyFee: 30, guardianName: "M. Ngo", guardianPhone: "696000006", current: { type: "full" } },
];

const SCHOOLS: SchoolSeed[] = [
  { clientId: "c_cedres", slug: "cedres", cycle: "primaire", joinYear: "2025-09", students: cedresStudents },
  { clientId: "c_fontaine", slug: "fontaine", cycle: "orientation", joinYear: "2025-09", students: fontaineStudents },
  { clientId: "c_excellence", slug: "excellence", cycle: "orientation", joinYear: "2025-09", students: excellenceStudents },
  { clientId: "c_horizon", slug: "horizon", cycle: "primaire", joinYear: "2025-09", students: horizonStudents },
  { clientId: "c_saintmichel", slug: "saintmichel", cycle: "primaire", joinYear: "2026-01", students: saintmichelStudents },
];

function buildStudents(): Student[] {
  const out: Student[] = [];
  for (const school of SCHOOLS) {
    school.students.forEach((s, i) => {
      out.push({
        id: `st_${school.slug}_${i}`,
        clientId: school.clientId,
        name: s.name,
        cycle: school.cycle,
        className: s.className,
        guardianContact: `${s.guardianName} · +237 ${s.guardianPhone.slice(0, 3)} ${s.guardianPhone.slice(3, 6)} ${s.guardianPhone.slice(6)}`,
        monthlyFee: s.monthlyFee,
        status: "active",
        joinDate: `${school.joinYear}-0${(i % 9) + 1}`,
        note: "",
      });
    });
  }
  return out;
}

/** Collapses one period's fee entry into the single amountDue/amountPaid/status/paidAt record payrolldesk stores per (student, period). */
function feeRecord(
  monthlyFee: number,
  entry: FeeEntry,
  period: string,
): Pick<FeePayment, "amountDue" | "amountPaid" | "status" | "paidAt"> {
  switch (entry.type) {
    case "full":
      return { amountDue: monthlyFee, amountPaid: monthlyFee, status: "paid", paidAt: new Date(`${period}-27T10:00:00`).toISOString() };
    case "partial":
      return { amountDue: monthlyFee, amountPaid: entry.amount, status: "partial", paidAt: new Date(`${period}-18T10:00:00`).toISOString() };
    case "none":
      return { amountDue: monthlyFee, amountPaid: 0, status: "unpaid", paidAt: null };
    case "installments": {
      const paid = entry.amounts.reduce((s, a) => s + a, 0);
      return {
        amountDue: monthlyFee,
        amountPaid: paid,
        status: paid >= monthlyFee ? "paid" : paid > 0 ? "partial" : "unpaid",
        paidAt: paid > 0 ? new Date(`${period}-16T10:00:00`).toISOString() : null,
      };
    }
    case "social_case":
      return { amountDue: entry.amountDue ?? 0, amountPaid: 0, status: "social_case", paidAt: null };
  }
}

/**
 * Builds fee-payment history for every school, one FeePayment row per
 * student per period. Most schools have both `shiftPeriod(currentPeriod,
 * -1)` and `currentPeriod` on file; a school with no `prior` entry for a
 * student (Excellence, Horizon, Saint-Michel) is one that's only been
 * tracking fees since the current period — no row is fabricated for the
 * period before that.
 */
function buildFeePayments(currentPeriod: string): FeePayment[] {
  const priorPeriod = shiftPeriod(currentPeriod, -1);
  const out: FeePayment[] = [];

  for (const school of SCHOOLS) {
    school.students.forEach((s, i) => {
      const studentId = `st_${school.slug}_${i}`;
      if (s.prior) {
        out.push({
          id: `fp_${school.slug}_${i}_${priorPeriod}`,
          clientId: school.clientId,
          studentId,
          period: priorPeriod,
          note: "",
          ...feeRecord(s.monthlyFee, s.prior, priorPeriod),
        });
      }
      out.push({
        id: `fp_${school.slug}_${i}_${currentPeriod}`,
        clientId: school.clientId,
        studentId,
        period: currentPeriod,
        note: "",
        ...feeRecord(s.monthlyFee, s.current, currentPeriod),
      });
    });
  }

  return out;
}

type SchoolExpenseSeed = [category: Expense["category"], description: string, amount: number, daysAgo: number];

const cedresExpenses: SchoolExpenseSeed[] = [
  ["fuel", "Carburant groupe électrogène", 225000, 57],
  ["maintenance", "Réparation plomberie", 150000, 49],
  ["supplies", "Craies, cahiers de classe", 110000, 43],
  ["credit", "Remboursement crédit bâtiment", 400000, 28],
  ["renovation", "Peinture salle CE1", 325000, 17],
];

const fontaineExpenses: SchoolExpenseSeed[] = [
  ["fuel", "Carburant véhicule scolaire", 300000, 54],
  ["utilities", "Facture électricité", 240000, 42],
  ["credit", "Échéance crédit mobilier", 475000, 29],
  ["other", "Fournitures administratives", 90000, 20],
];

const excellenceExpenses: SchoolExpenseSeed[] = [
  ["supplies", "Manuels bilingues", 150, 30],
  ["fuel", "Carburant bus scolaire", 90, 22],
  ["maintenance", "Entretien climatisation", 45, 12],
];

const horizonExpenses: SchoolExpenseSeed[] = [
  ["renovation", "Réfection cour de récréation", 250000, 25],
  ["supplies", "Matériel pédagogique maternelle", 120000, 16],
];

const saintmichelExpenses: SchoolExpenseSeed[] = [
  ["renovation", "Aménagement des salles de classe", 200, 60],
  ["supplies", "Tables-bancs et fournitures", 140, 52],
];

const SCHOOL_EXPENSES: Record<string, { expenses: SchoolExpenseSeed[]; submittedBy: string }> = {
  c_cedres: { expenses: cedresExpenses, submittedBy: "Marceline Fotso" },
  c_fontaine: { expenses: fontaineExpenses, submittedBy: "Rodrigue Tchinda" },
  c_excellence: { expenses: excellenceExpenses, submittedBy: "Rose Ateba" },
  c_horizon: { expenses: horizonExpenses, submittedBy: "Théophile Mbassi" },
  c_saintmichel: { expenses: saintmichelExpenses, submittedBy: "Anicet Owona" },
};

function buildExpenses(): Expense[] {
  const out: Expense[] = [];
  for (const school of SCHOOLS) {
    const { expenses, submittedBy } = SCHOOL_EXPENSES[school.clientId];
    expenses.forEach(([category, description, amount, daysAgo], i) => {
      const date = new Date(Date.now() - daysAgo * 86_400_000);
      out.push({
        id: `ex_${school.slug}_${i}`,
        clientId: school.clientId,
        category,
        description,
        amount,
        date: date.toISOString().slice(0, 10),
        submittedBy,
        createdAt: date.toISOString(),
      });
    });
  }
  return out;
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

const cedresDeliveries: DeliverySeed[] = [
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

const cedresSales: SaleSeed[] = [
  ["uniform", "Uniform — Size S", 5, 25, "Guardian of Aristide Fouda", 40],
  ["uniform", "Uniform — Size S", 7, 25, "Guardian of Line Ngo Bikoi", 22],
  ["uniform", "Uniform — Size M", 10, 25, "Guardian of Rebecca Same", 38],
  ["uniform", "Uniform — Size M", 8, 25, "Guardian of Josué Belinga", 15],
  ["shoes", "Shoes — Size 36", 9, 30, "Guardian of Franck Mbella", 20],
  ["sweater", "Sweater — Size M", 10, 15, "Guardian of Yvan Ndzana", 18],
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

const cedresCounts: CountSeed[] = [
  ["uniform", "Uniform — Size S", 18, 5],
  ["uniform", "Uniform — Size M", 22, 5],
  ["shoes", "Shoes — Size 36", 8, 5],
  ["sweater", "Sweater — Size M", 15, 5],
];

function daysAgoIso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

function buildSupplyDeliveries(): SupplyDelivery[] {
  return cedresDeliveries.map(([category, itemLabel, quantity, daysAgo, reference], i) => ({
    id: `sd_cedres_${i}`,
    clientId: "c_cedres",
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
  return cedresSales.map(([category, itemLabel, quantity, unitPrice, buyerName, daysAgo], i) => ({
    id: `ss_cedres_${i}`,
    clientId: "c_cedres",
    category,
    itemLabel,
    quantity,
    unitPrice,
    totalAmount: quantity * unitPrice,
    buyerName,
    soldAt: daysAgoIso(daysAgo).slice(0, 10),
    recordedBy: "Chantal Biya",
    createdAt: daysAgoIso(daysAgo),
  }));
}

function buildSupplyInventoryCounts(): SupplyInventoryCount[] {
  return cedresCounts.map(([category, itemLabel, countedQty, daysAgo], i) => {
    const delivered = cedresDeliveries
      .filter((d) => d[0] === category && d[1] === itemLabel)
      .reduce((sum, d) => sum + d[2], 0);
    const sold = cedresSales
      .filter((s) => s[0] === category && s[1] === itemLabel)
      .reduce((sum, s) => sum + s[2], 0);
    const expectedQty = delivered - sold;
    return {
      id: `sic_cedres_${i}`,
      clientId: "c_cedres",
      category,
      itemLabel,
      countedQty,
      expectedQty,
      variance: countedQty - expectedQty,
      countedAt: daysAgoIso(daysAgo).slice(0, 10),
      countedBy: "Chantal Biya",
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
    activeClientId: "c_cedres",
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
