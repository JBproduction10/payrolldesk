"use client";

import { useLocale } from "next-intl";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { compactMoney, money, periodShort } from "@/lib/format";
import type { Currency } from "@/lib/types";

export interface TrendPoint {
  period: string;
  amount: number;
}

function TrendTooltip({
  active,
  payload,
  currency,
  locale,
}: {
  active?: boolean;
  payload?: Array<{ payload: TrendPoint }>;
  currency: Currency;
  locale: "en" | "fr";
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <div className="font-medium text-foreground">{periodShort(point.period, locale)}</div>
      <div className="text-muted-foreground">{money(point.amount, currency, locale)}</div>
    </div>
  );
}

export function PayrollTrendChart({
  data,
  currency,
}: {
  data: TrendPoint[];
  currency: Currency;
}) {
  const locale = useLocale() as "en" | "fr";
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="payrollTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-pine)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--brand-pine)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
          <XAxis
            dataKey="period"
            tickFormatter={(p: string) => periodShort(p, locale).split(" ")[0]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            dy={8}
          />
          <YAxis
            tickFormatter={(v: number) => compactMoney(v, currency)}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            width={56}
          />
          <Tooltip content={<TrendTooltip currency={currency} locale={locale} />} cursor={{ stroke: "var(--border)" }} />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="var(--brand-pine)"
            strokeWidth={2.5}
            fill="url(#payrollTrendFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
