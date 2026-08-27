import type { DeptPayroll } from "@/lib/aggregate";
import { money } from "@/lib/format";
import { swatch } from "@/lib/colors";
import type { Currency } from "@/lib/types";

export function DepartmentPayrollList({
  data,
  currency,
}: {
  data: DeptPayroll[];
  currency: Currency;
}) {
  const max = Math.max(1, ...data.map((d) => d.amount));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-4 font-heading text-base font-semibold text-foreground">
        Payroll by Department
      </h3>
      {data.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Add a department to see payroll split out here.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {data.map(({ department, amount }) => (
            <div key={department.id}>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className="font-medium text-foreground">{department.name}</span>
                <span className="text-muted-foreground">
                  {money(amount, currency)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{
                    width: `${Math.max(4, (amount / max) * 100)}%`,
                    backgroundColor: swatch(department.color).bar,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
