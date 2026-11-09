"use client";

import StateCard from "@/components/shared/StateCard/StateCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetchData } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import { Wallet } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { categoryColor, formatTaka } from "./SpendingSummaryView";
import { TSpendingTrend } from "./type/spending.types";

const formatMonthTick = (targetMonth: string) =>
  format(parse(targetMonth, "yyyy-MM", new Date()), "MMM");

const formatMonthLabel = (label: React.ReactNode) =>
  typeof label === "string"
    ? format(parse(label, "yyyy-MM", new Date()), "MMM yyyy")
    : label;

const tooltipStyle = {
  background: "var(--popover)",
  border: "none",
  borderRadius: 8,
  boxShadow: "var(--elev-md)",
  fontSize: 12,
};

type TProps = {
  bikeId: string;
  // "rail" = compact sidebar sparkline (rolling last 6 months) on the summary periods.
  // "full" = the Trend tab: a fixed calendar year (Jan→Dec, 12 bars) for `targetYear`.
  variant?: "full" | "rail";
  // full variant only — the calendar year to show (defaults to the current year).
  targetYear?: string;
  onOpenTrend?: () => void;
  className?: string;
};

export default function SpendingTrendChart({
  bikeId,
  variant = "full",
  targetYear,
  onOpenTrend,
  className,
}: TProps) {
  const isRail = variant === "rail";
  const year = targetYear ?? new Date()?.getFullYear()?.toString();

  // Rail and the full year view must not share a cache key: the rail is a rolling
  // 6-month window, the full tab a fixed calendar year. Both stay under the
  // ["spending","trend",bikeId] prefix so mutations still invalidate them.
  const { data, isLoading, isError, error, refetch } =
    useFetchData<TSpendingTrend>(
      isRail
        ? ["spending", "trend", bikeId, "rail6"]
        : ["spending", "trend", bikeId, year],
      isRail
        ? `/bikes/${bikeId}/spending-summary/trend?months=6`
        : `/bikes/${bikeId}/spending-summary/trend?targetYear=${year}`,
    );

  const monthlySummary = data?.data?.monthlySummary ?? [];

  // Donut/highlight month = latest month that actually has spending. For the rail
  // that's just the last bucket; for the full year, December would leave the current
  // year's donut empty until year-end, so pick the latest month *with data*.
  const monthsWithSpending = monthlySummary?.filter((m) => m?.totalSpending > 0);
  const donutMonth = isRail
    ? monthlySummary[monthlySummary?.length - 1]
    : monthsWithSpending[monthsWithSpending?.length - 1];
  const highlightIdx = donutMonth
    ? monthlySummary?.findIndex((m) => m?.targetMonth === donutMonth?.targetMonth)
    : -1;

  const latestBreakdown = [...(donutMonth?.categoryBreakdown ?? [])].sort(
    (a, b) => b?.total - a?.total,
  );
  const latestSum = latestBreakdown?.reduce((a, c) => a + c?.total, 0) || 1;

  const bars = (height: string, withLabels: boolean) => (
    <div className={cn("w-full", height)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={monthlySummary}
          margin={{ top: withLabels ? 18 : 2, right: 0, left: 0, bottom: 0 }}
        >
          <XAxis
            dataKey="targetMonth"
            tickFormatter={formatMonthTick}
            tickLine={false}
            axisLine={false}
            fontSize={withLabels ? 11 : 10}
            interval={0}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-hover)" }}
            labelFormatter={formatMonthLabel}
            formatter={(v) => [formatTaka(Number(v)), "Spent"]}
            contentStyle={tooltipStyle}
          />
          <Bar
            dataKey="totalSpending"
            radius={withLabels ? [4, 4, 0, 0] : [3, 3, 0, 0]}
            maxBarSize={44}
          >
            {monthlySummary?.map((m, i) => (
              <Cell
                key={m?.targetMonth}
                fill="var(--chart-1)"
                fillOpacity={i === highlightIdx ? 1 : 0.55}
              />
            ))}
            {withLabels && (
              <LabelList
                dataKey="totalSpending"
                position="top"
                fontSize={10.5}
                fill="var(--muted-foreground)"
                formatter={(v) =>
                  Number(v) > 0
                    ? `৳${Math.round(Number(v)).toLocaleString()}`
                    : ""
                }
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  if (isRail) {
    return (
      <div className={cn("panel flex-col px-4 pt-3.5 pb-2.5", className)}>
        <div className="mb-2.5 flex justify-between text-[12.5px]">
          <span className="font-medium">Last 6 months</span>
          <button
            type="button"
            onClick={onOpenTrend}
            className="text-primary hover:underline"
          >
            Trend →
          </button>
        </div>
        {isLoading ? <Skeleton className="h-[90px]" /> : bars("h-[90px]", false)}
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        <Skeleton className="h-[240px] rounded-[10px]" />
        <Skeleton className="h-[152px] rounded-[10px]" />
      </>
    );
  }

  if (isError) {
    return (
      <StateCard
        variant="error"
        title="Couldn’t load the trend"
        message={error?.message}
        onRetry={() => refetch()}
        className="max-w-none"
      />
    );
  }

  // A calendar year with no spending in any month → single empty state, not a flat
  // all-zero chart.
  if (monthsWithSpending?.length === 0) {
    return (
      <StateCard
        icon={Wallet}
        title={`Nothing spent in ${year}`}
        message="No fuel, maintenance, oil or accessory spending was logged this year."
        className="max-w-none"
      />
    );
  }

  return (
    <>
      <div className="panel px-4 pt-4 pb-2.5">
        <div className="mb-3 text-[13px] font-medium">Spending in {year}</div>
        {bars("h-[200px]", true)}
      </div>

      <div className="panel flex items-center gap-5 p-4">
        {latestBreakdown?.length > 0 ? (
          <>
            <div className="size-[120px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={latestBreakdown}
                    dataKey="total"
                    nameKey="category"
                    innerRadius={38}
                    outerRadius={60}
                    stroke="none"
                  >
                    {latestBreakdown?.map((entry, index) => (
                      <Cell key={entry?.category} fill={categoryColor(index)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatTaka(Number(v))}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-[12.5px]">
              <div className="text-[13px] font-medium">
                By category · {formatMonthLabel(donutMonth?.targetMonth)}
              </div>
              {latestBreakdown?.map((c, i) => (
                <div key={c?.category} className="flex items-center gap-2">
                  <span
                    className="size-2 shrink-0 rounded-[2px]"
                    style={{ background: categoryColor(i) }}
                  />
                  <span className="flex-1 truncate">{c?.category}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {((c?.total / latestSum) * 100)?.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No spending data for this month.
          </p>
        )}
      </div>
    </>
  );
}
