"use client";

import { useRef, useState } from "react";
import { Upload, FileDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePayroll } from "@/lib/store";
import { csvToObjects } from "@/lib/csv";
import type { Cycle, Student, StudentStatus } from "@/lib/types";
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

const TEMPLATE = `name,cycle,className,monthlyFee,guardianContact,guardianEmail,joinDate
Kwame Asante,primaire,Grade 5,120,+233 24 000 0000,guardian@example.com,2024-09-01
Abena Owusu,primaire,Grade 4,110,+233 24 000 0001,,`;

type ParsedRow =
  | { ok: true; student: Omit<Student, "id" | "clientId"> }
  | { ok: false; line: number; reason: string };

function parseStatus(value: string): StudentStatus {
  return value.trim().toLowerCase() === "withdrawn" ? "withdrawn" : "active";
}

const VALID_CYCLES: Cycle[] = ["primaire", "orientation", "superieur"];

/** Defaults to "primaire" when the column is missing or unrecognized, rather
 *  than rejecting the whole row over one optional field. */
function parseCycle(value: string | undefined): Cycle {
  const v = value?.trim().toLowerCase();
  return (VALID_CYCLES as string[]).includes(v ?? "") ? (v as Cycle) : "primaire";
}

function parseRows(text: string): ParsedRow[] {
  const rows = csvToObjects(text);
  return rows.map((row, i) => {
    const line = i + 2; // +1 for header row, +1 for 1-indexing
    const name = row.name?.trim();
    const className = row.classname?.trim() || row.class?.trim();
    const feeRaw = row.monthlyfee?.trim();

    if (!name) return { ok: false, line, reason: "Missing name" };
    if (!className) return { ok: false, line, reason: "Missing class" };
    const monthlyFee = Number(feeRaw);
    if (!feeRaw || Number.isNaN(monthlyFee) || monthlyFee <= 0) {
      return { ok: false, line, reason: `Invalid monthly fee "${feeRaw ?? ""}"` };
    }

    return {
      ok: true,
      student: {
        name,
        cycle: parseCycle(row.cycle),
        className,
        guardianContact: row.guardiancontact?.trim() || "",
        guardianEmail: row.guardianemail?.trim() || "",
        monthlyFee,
        status: parseStatus(row.status ?? ""),
        joinDate: row.joindate?.trim() || new Date().toISOString().slice(0, 10),
        note: "",
      },
    };
  });
}

export function ImportStudentsDialog() {
  const { addStudentsBulk } = usePayroll();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    a.download = "students-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    if (valid.length === 0) return;
    const count = addStudentsBulk(valid.map((r) => r.student));
    toast.add({
      title: `Imported ${count} student${count === 1 ? "" : "s"}`,
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
          <DialogTitle>Import students from CSV</DialogTitle>
          <DialogDescription>
            Columns: <code>name, className, monthlyFee</code> are required —{" "}
            <code>cycle, guardianContact, guardianEmail, joinDate, status</code> are optional
            (cycle defaults to "primaire" if left out).
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
            Import {valid.length || ""} Student{valid.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
