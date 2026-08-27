"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { usePayroll } from "@/lib/store";
import { periodLabel, shiftPeriod } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function PeriodSwitcher() {
  const { period, setPeriod } = usePayroll();

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-card px-1.5 py-1 shadow-sm">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setPeriod(shiftPeriod(period, -1))}
        aria-label="Previous period"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <div className="flex items-center gap-1.5 px-1.5 text-sm font-medium text-foreground">
        <CalendarDays className="size-3.5 text-muted-foreground" />
        {periodLabel(period)}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setPeriod(shiftPeriod(period, 1))}
        aria-label="Next period"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
