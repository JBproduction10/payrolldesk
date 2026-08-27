"use client";

import { useRef, useState } from "react";
import { Upload, FileDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePayroll } from "@/lib/store";
import { csvToObjects } from "@/lib/csv";
import type { Employee, EmployeeStatus } from "@/lib/types";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const TEMPLATE = `name,email,department,position,baseSalary,phone,joinDate
Maya Patel,maya.patel@acme.io,Engineering,Engineer,6000,+1 555 000 0000,2024-01-15
Ethan Brooks,ethan.brooks@acme.io,Sales,Account Executive,5200,,`;

type ParsedRow =
  | { ok: true; employee: Omit<Employee, "id" | "clientId"> }
  | { ok: false; line: number; reason: string };

function parseStatus(value: string): EmployeeStatus {
  const v = value.trim().toLowerCase();
  if (v === "leave" || v === "on leave") return "leave";
  if (v === "inactive") return "inactive";
  return "active";
}

export function ImportEmployeesDialog() {
  const { activeClient, clientDepartments, addEmployeesBulk } = usePayroll();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function parseRows(csvText: string): ParsedRow[] {
    const rows = csvToObjects(csvText);
    return rows.map((row, i) => {
      const line = i + 2;
      const name = row.name?.trim();
      const email = row.email?.trim();
      const deptName = row.department?.trim();
      const position = row.position?.trim();
      const salaryRaw = row.basesalary?.trim();

      if (!name) return { ok: false, line, reason: "Missing name" };
      if (!email) return { ok: false, line, reason: "Missing email" };
      if (!position) return { ok: false, line, reason: "Missing position" };

      const department = clientDepartments.find(
        (d) => d.name.toLowerCase() === deptName?.toLowerCase(),
      );
      if (!department) {
        const available = clientDepartments.map((d) => d.name).join(", ");
        return {
          ok: false,
          line,
          reason: `Unknown department "${deptName ?? ""}" — available: ${available}`,
        };
      }

      const baseSalary = Number(salaryRaw);
      if (!salaryRaw || Number.isNaN(baseSalary) || baseSalary <= 0) {
        return { ok: false, line, reason: `Invalid base salary "${salaryRaw ?? ""}"` };
      }

      const phone = row.phone?.trim() || "";
      const channels: Employee["channels"] = phone ? ["email", "whatsapp"] : ["email"];
      return {
        ok: true,
        employee: {
          departmentId: department.id,
          code: `${activeClient.name.slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
          name,
          email,
          phone,
          position,
          baseSalary,
          status: parseStatus(row.status ?? ""),
          joinDate: row.joindate?.trim() || new Date().toISOString().slice(0, 10),
          channels,
          values: {},
        },
      };
    });
  }

  const valid = parsed?.filter((r): r is Extract<ParsedRow, { ok: true }> => r.ok) ?? [];
  const invalid = parsed?.filter((r): r is Extract<ParsedRow, { ok: false }> => !r.ok) ?? [];

  function reset() {
    setText("");
    setParsed(null);
  }

  function handleParse(value: string) {
    setText(value);
    setParsed(value.trim() ? parseRows(value) : null);
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => handleParse(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    if (valid.length === 0) return;
    const count = addEmployeesBulk(valid.map((r) => r.employee));
    toast.add({
      title: `Imported ${count} employee${count === 1 ? "" : "s"}`,
      description: invalid.length > 0 ? `${invalid.length} row(s) skipped` : undefined,
      type: "success",
    });
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline">
            <Upload className="size-4" />
            Import CSV
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import employees from CSV</DialogTitle>
          <DialogDescription>
            Columns: <code>name, email, department, position, baseSalary</code> are
            required — <code>phone, joinDate, status</code> are optional. Department
            must match an existing department name exactly (case-insensitive).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              Choose CSV file
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate}>
              <FileDown className="size-3.5" />
              Download template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </div>

          <Textarea
            value={text}
            onChange={(e) => handleParse(e.target.value)}
            placeholder="Or paste CSV content here (e.g. copied from Excel or Google Sheets)…"
            className="h-32 font-mono text-xs"
          />

          {parsed && (
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
              <div className="flex items-center gap-1.5 text-success">
                <CheckCircle2 className="size-4" />
                {valid.length} row{valid.length === 1 ? "" : "s"} ready to import
              </div>
              {invalid.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-1.5 text-brand-clay">
                    <AlertTriangle className="size-4" />
                    {invalid.length} row{invalid.length === 1 ? "" : "s"} skipped
                  </div>
                  <ul className="mt-1 max-h-24 overflow-y-auto scrollbar-thin pl-6 text-xs text-muted-foreground">
                    {invalid.map((r, i) => (
                      <li key={i} className="list-disc">
                        Row {r.line}: {r.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={valid.length === 0}>
            Import {valid.length || ""} Employee{valid.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
