"use client";

import { format, parse } from "date-fns";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFetchData } from "@/hooks/useApi";
import { TMileageTrend } from "./type/mileage.types";

const formatMonthTick = (targetMonth: string) =>
  format(parse(targetMonth, "yyyy-MM", new Date()), "MMM");

const formatMonthLabel = (label: React.ReactNode) =>
  typeof label === "string"
    ? format(parse(label, "yyyy-MM", new Date()), "MMM yyyy")
    : label;

export default function MileageTrendTab({ bikeId }: { bikeId: string }) {
  const { data, isLoading } = useFetchData<TMileageTrend>(
    ["mileage", "trend", bikeId],
    `/bikes/${bikeId}/mileage/trend?months=3`,
  );

  const trend = data?.data;
  const monthlySummary = trend?.monthlySummary ?? [];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-2 text-sm font-medium">Distance, last 3 months</p>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlySummary}>
            <XAxis dataKey="targetMonth" tickFormatter={formatMonthTick} fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip labelFormatter={formatMonthLabel} />
            <Bar dataKey="totalDistanceKm" fill="var(--color-chart-2)" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
