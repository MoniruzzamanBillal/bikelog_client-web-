"use client";

import StateCard from "@/components/shared/StateCard/StateCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetchData } from "@/hooks/useApi";
import { format, parse } from "date-fns";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { TMileageTrend } from "./type/mileage.types";

const formatMonthTick = (targetMonth: string) =>
  format(parse(targetMonth, "yyyy-MM", new Date()), "MMM");

const formatMonthLabel = (label: React.ReactNode) =>
  typeof label === "string"
    ? format(parse(label, "yyyy-MM", new Date()), "MMM yyyy")
    : label;

export default function MileageTrendTab({ bikeId }: { bikeId: string }) {
  const { data, isLoading, isError, error, refetch } =
    useFetchData<TMileageTrend>(
      ["mileage", "trend", bikeId],
      `/bikes/${bikeId}/mileage/trend?months=6`,
    );

  const monthlySummary = data?.data?.monthlySummary ?? [];

  if (isLoading) {
    return <Skeleton className="h-[240px] rounded-[10px]" />;
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

  return (
    <div className="panel px-4 pt-4 pb-2.5">
      <div className="mb-3 text-[13px] font-medium">Distance, last 6 months</div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={monthlySummary}
            margin={{ top: 18, right: 0, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="targetMonth"
              tickFormatter={formatMonthTick}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tick={{ fill: "var(--muted-foreground)" }}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-hover)" }}
              labelFormatter={formatMonthLabel}
              formatter={(v) => [`${Number(v).toLocaleString()} km`, "Distance"]}
              contentStyle={{
                background: "var(--popover)",
                border: "none",
                borderRadius: 8,
                boxShadow: "var(--elev-md)",
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="totalDistanceKm"
              radius={[4, 4, 0, 0]}
              maxBarSize={44}
            >
              {/* current month solid, earlier months softened */}
              {monthlySummary.map((m, i) => (
                <Cell
                  key={m.targetMonth}
                  fill="var(--chart-1)"
                  fillOpacity={i === monthlySummary.length - 1 ? 1 : 0.55}
                />
              ))}
              <LabelList
                dataKey="totalDistanceKm"
                position="top"
                fontSize={11}
                fill="var(--muted-foreground)"
                formatter={(v) => Number(v).toLocaleString()}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
