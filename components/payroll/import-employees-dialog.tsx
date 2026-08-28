"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("importDialog");
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

      if (!name) return { ok: false, line, reason: t("errorMissingName") };
      if (!email) return { ok: false, line, reason: t("errorMissingEmail") };
      if (!position) return { ok: false, line, reason: t("errorMissingPosition") };

      const department = clientDepartments.find(
        (d) => d.name.toLowerCase() === deptName?.toLowerCase(),
      );
      if (!department) {
        const available = clientDepartments.map((d) => d.name).join(", ");
        return {
          ok: false,
          line,
          reason: t("errorUnknownDepartment", { name: deptName ?? "", available }),
        };
      }

      const baseSalary = Number(salaryRaw);
      if (!salaryRaw || Number.isNaN(baseSalary) || baseSalary <= 0) {
        return { ok: false, line, reason: t("errorInvalidSalary", { value: salaryRaw ?? "" }) };
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
      title: count === 1 ? t("importedToast", { count }) : t("importedToastOther", { count }),
      description: invalid.length > 0 ? t("rowsSkippedDescription", { count: invalid.length }) : undefined,
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
            {t("importCsv")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("employeesTitle")}</DialogTitle>
          <DialogDescription>
            {t("employeesColumnsInfo")}
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
              {t("chooseFile")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate}>
              <FileDown className="size-3.5" />
              {t("downloadTemplate")}
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
            placeholder={t("pastePlaceholder")}
            className="h-32 font-mono text-xs"
          />

          {parsed && (
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
              <div className="flex items-center gap-1.5 text-success">
                <CheckCircle2 className="size-4" />
                {valid.length === 1
                  ? t("rowsReady", { count: valid.length })
                  : t("rowsReadyOther", { count: valid.length })}
              </div>
              {invalid.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-1.5 text-brand-clay">
                    <AlertTriangle className="size-4" />
                    {invalid.length === 1
                      ? t("rowsSkipped", { count: invalid.length })
                      : t("rowsSkippedOther", { count: invalid.length })}
                  </div>
                  <ul className="mt-1 max-h-24 overflow-y-auto scrollbar-thin pl-6 text-xs text-muted-foreground">
                    {invalid.map((r, i) => (
                      <li key={i} className="list-disc">
                        {t("rowError", { line: r.line, reason: r.reason })}
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
            {t("cancel")}
          </Button>
          <Button onClick={handleImport} disabled={valid.length === 0}>
            {valid.length === 1
              ? t("importOne", { count: valid.length })
              : t("importOther", { count: valid.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
