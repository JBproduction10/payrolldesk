import { CalendarClock } from "lucide-react";
import { formatDate, payDate } from "@/lib/format";
import { money } from "@/lib/format";
import type { Currency } from "@/lib/types";

export function NextPaydayCard({
  period,
  payDay,
  netPayable,
  employeeCount,
  currency,
}: {
  period: string;
  payDay: number;
  netPayable: number;
  employeeCount: number;
  currency: Currency;
}) {
  const date = payDate(period, payDay);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
  const label = days < 0 ? "Paid" : days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"}`;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="font-heading text-base font-semibold text-foreground">
        Next Payday
      </h3>
      <p className="mt-0.5 text-sm text-muted-foreground">End of month</p>

      <div className="my-4 flex flex-col items-center gap-1 rounded-xl bg-secondary py-6">
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-secondary-foreground/80 uppercase">
          <CalendarClock className="size-3.5" />
          {days < 0 ? "Paid" : "Pays in"}
        </div>
        <div className="font-heading text-3xl font-semibold text-primary">{label}</div>
        <div className="text-sm text-muted-foreground">{formatDate(date)}</div>
      </div>

      <dl className="mt-auto flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Net payable</dt>
          <dd className="font-semibold text-foreground">
            {money(netPayable, currency)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Employees</dt>
          <dd className="font-semibold text-foreground">{employeeCount}</dd>
        </div>
      </dl>
    </div>
  );
}
