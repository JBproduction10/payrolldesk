"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { usePayroll } from "@/lib/store";
import { downloadCsv, downloadText } from "@/lib/csv";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function ExportPanel() {
  const {
    clients,
    departments,
    employees,
    fields,
    payslips,
    students,
    feePayments,
    expenses,
    templates,
    activeClient,
    clientEmployees,
    clientStudents,
    clientPayslips,
  } = usePayroll();
  const [exporting, setExporting] = useState(false);

  const downloadEverything = () => {
    setExporting(true);
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        clients,
        departments,
        employees,
        fields,
        payslips,
        students,
        feePayments,
        expenses,
        templates,
      };
      downloadText(
        `payrolldesk-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(payload, null, 2),
        "application/json",
      );
      toast.add({ title: "Backup downloaded" });
    } finally {
      setExporting(false);
    }
  };

  const downloadEmployeesCsv = () => {
    const rows = [
      ["Name", "Email", "Phone", "Position", "Base salary", "Status", "Join date"],
      ...clientEmployees.map((e) => [
        e.name,
        e.email,
        e.phone,
        e.position,
        e.baseSalary,
        e.status,
        e.joinDate,
      ]),
    ];
    downloadCsv(`${activeClient.name}-employees.csv`, rows);
  };

  const downloadStudentsCsv = () => {
    const rows = [
      ["Name", "Class", "Guardian contact", "Monthly fee", "Status", "Join date"],
      ...clientStudents.map((s) => [
        s.name,
        s.className,
        s.guardianContact,
        s.monthlyFee,
        s.status,
        s.joinDate,
      ]),
    ];
    downloadCsv(`${activeClient.name}-students.csv`, rows);
  };

  const downloadPayslipsCsv = () => {
    const empById = new Map(employees.map((e) => [e.id, e]));
    const rows = [
      ["Employee", "Period", "Gross", "Net", "Status"],
      ...clientPayslips.map((p) => [
        empById.get(p.employeeId)?.name ?? p.employeeId,
        p.period,
        money(p.gross ?? 0),
        money(p.net ?? 0),
        p.status,
      ]),
    ];
    downloadCsv(`${activeClient.name}-payslips.csv`, rows);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-heading text-base font-semibold text-foreground">
              Download everything
            </h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              A single JSON file with every client, employee, student, and
              payslip in your workspace — a self-serve backup you can pull
              any time, without needing to reach anyone or query the database.
            </p>
          </div>
          <Button onClick={downloadEverything} disabled={exporting}>
            <Download className="size-4" />
            {exporting ? "Preparing…" : "Download backup"}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Spreadsheet exports — {activeClient.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Quick CSVs for the current client, ready for Excel or Google Sheets.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadEmployeesCsv}>
            <FileSpreadsheet className="size-3.5" />
            Employees CSV
          </Button>
          <Button variant="outline" size="sm" onClick={downloadStudentsCsv}>
            <FileSpreadsheet className="size-3.5" />
            Students CSV
          </Button>
          <Button variant="outline" size="sm" onClick={downloadPayslipsCsv}>
            <FileJson className="size-3.5" />
            Payslips CSV
          </Button>
        </div>
      </section>
    </div>
  );
}
