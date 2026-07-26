"use client";

import { format, parse } from "date-fns";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFetchData } from "@/hooks/useApi";
import { TSpendingTrend } from "./type/spending.types";

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const formatMonthTick = (targetMonth: string) =>
  format(parse(targetMonth, "yyyy-MM", new Date()), "MMM");

const formatMonthLabel = (label: React.ReactNode) =>
  typeof label === "string"
    ? format(parse(label, "yyyy-MM", new Date()), "MMM yyyy")
    : label;

export default function SpendingTrendChart({ bikeId }: { bikeId: string }) {
  const { data, isLoading } = useFetchData<TSpendingTrend>(
    ["spending", "trend", bikeId],
    `/bikes/${bikeId}/spending-summary/trend?months=3`,
  );

  const trend = data?.data;
  const monthlySummary = trend?.monthlySummary ?? [];
  const latestBreakdown =
    monthlySummary.length > 0
      ? monthlySummary[monthlySummary.length - 1].categoryBreakdown
      : [];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-2 text-sm font-medium">Spending, last 3 months</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySummary}>
              <XAxis dataKey="targetMonth" tickFormatter={formatMonthTick} fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip labelFormatter={formatMonthLabel} />
              <Bar dataKey="totalSpending" fill="var(--color-chart-1)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-2 text-sm font-medium">
          By category (
          {monthlySummary.length > 0
            ? formatMonthLabel(monthlySummary[monthlySummary.length - 1].targetMonth)
            : "this month"}
          )
        </p>
        {latestBreakdown.length > 0 ? (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={latestBreakdown}
                  dataKey="total"
                  nameKey="category"
                  innerRadius={50}
                  outerRadius={80}
                >
                  {latestBreakdown.map((entry, index) => (
                    <Cell
                      key={entry.category}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No spending data for this month.
          </p>
        )}
      </div>
    </div>
  );
}
