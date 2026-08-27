"use client";

import { useMemo, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { usePayroll } from "@/lib/store";
import { computePayslip } from "@/lib/payroll";
import { money, periodLabel, recentPeriods } from "@/lib/format";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export function GeneratePayslipsDialog({
  trigger,
  redirectOnGenerate = false,
}: {
  trigger: ReactElement;
  redirectOnGenerate?: boolean;
}) {
  const { period, clientEmployees, clientFields, activeClient, generatePayslips } =
    usePayroll();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(period);

  const periodOptions = useMemo(() => {
    const past = recentPeriods(period, 4); // includes current period, oldest first
    const [y, m] = period.split("-").map(Number);
    const future = [1, 2].map((i) => {
      const d = new Date(y, m - 1 + i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    return Array.from(new Set([...past, ...future]));
  }, [period]);

  const targets = clientEmployees.filter((e) => e.status !== "inactive");
  const totals = targets.reduce(
    (acc, e) => {
      const c = computePayslip(e, clientFields);
      acc.gross += c.gross;
      acc.deductions += c.totalDeductions;
      acc.net += c.net;
      return acc;
    },
    { gross: 0, deductions: 0, net: 0 },
  );

  function handleGenerate() {
    const count = generatePayslips(selected);
    toast.add({
      title: `Generated ${count} payslip${count === 1 ? "" : "s"}`,
      description: `${periodLabel(selected)} · ${activeClient.name}`,
      type: "success",
    });
    setOpen(false);
    if (redirectOnGenerate) router.push("/payslips");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSelected(period);
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Payslips</DialogTitle>
          <DialogDescription>
            Create draft payslips for every active employee at {activeClient.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gp-period">Pay period</Label>
          <NativeSelect
            id="gp-period"
            className="w-full"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {periodOptions.map((p) => (
              <NativeSelectOption key={p} value={p}>
                {periodLabel(p)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="rounded-xl border border-border bg-muted/50 p-4">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Sparkles className="size-3.5 text-brand-gold" />
            Preview for {periodLabel(selected)}
          </div>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Employees included</dt>
              <dd className="font-medium text-foreground">{targets.length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Total deductions</dt>
              <dd className="font-medium text-destructive">
                −{money(totals.deductions, activeClient.currency)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2">
              <dt className="font-medium text-foreground">Net payable</dt>
              <dd className="font-heading text-base font-semibold text-primary">
                {money(totals.net, activeClient.currency)}
              </dd>
            </div>
          </dl>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={targets.length === 0}>
            Generate {targets.length} Payslip{targets.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
