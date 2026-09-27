"use client";

import PeriodStepper from "@/components/shared/PeriodStepper/PeriodStepper";
import StateCard from "@/components/shared/StateCard/StateCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetchData } from "@/hooks/useApi";
import { format } from "date-fns";
import { Gauge } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { TYearlyMileage } from "./type/mileage.types";

export default function YearlyMileageTab({ bikeId }: { bikeId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear().toString());

  const { data, isLoading, isError, error, refetch } =
    useFetchData<TYearlyMileage>(
      ["mileage", "yearly", bikeId, year],
      `/bikes/${bikeId}/mileage/yearly?targetYear=${year}`,
      { enabled: !!year },
    );
  const summary = data?.data?.monthlySummary ?? [];

  // chart shows all 12 months; months with no fills plot as 0
  const byMonth = new Map(summary.map((m) => [m.targetMonth, m]));
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    return {
      month: format(new Date(Number(year), i), "MMM"),
      totalDistanceKm: byMonth.get(key)?.totalDistanceKm ?? 0,
    };
  });
  const rows = summary
    .filter((m) => m.fuelLogCount > 0)
    .sort((a, b) => b.targetMonth.localeCompare(a.targetMonth));

  return (
    <>
      <PeriodStepper
        label={year}
        onPrev={() => setYear((y) => (Number(y) - 1).toString())}
        onNext={() => setYear((y) => (Number(y) + 1).toString())}
        disableNext={Number(year) >= now.getFullYear()}
      />

      {isLoading ? (
        <>
          <Skeleton className="h-[180px] rounded-[10px]" />
          <Skeleton className="h-40 rounded-[10px]" />
        </>
      ) : isError ? (
        <StateCard
          variant="error"
          title="Couldn’t load this year"
          message={error?.message}
          onRetry={() => refetch()}
          className="max-w-none"
        />
      ) : rows.length === 0 ? (
        <StateCard
          icon={Gauge}
          title={`No fuel logs in ${year}`}
          className="max-w-none"
        />
      ) : (
        <>
          <div className="panel px-4 pt-4 pb-2.5">
            <div className="mb-2.5 text-[13px] font-medium">
              Distance by month
            </div>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10.5}
                    tick={{ fill: "var(--muted-foreground)" }}
                    interval={0}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--surface-hover)" }}
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
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel overflow-x-auto px-1.5 py-1">
            <table className="w-full text-[13px] tabular-nums">
              <thead>
                <tr className="row-fade">
                  <th className="h-9 px-2 text-left text-[11px] font-normal tracking-[0.08em] text-muted-foreground uppercase">
                    Month
                  </th>
                  {["Distance", "Liters", "Fills"].map((h) => (
                    <th
                      key={h}
                      className="h-9 px-2 text-right text-[11px] font-normal tracking-[0.08em] text-muted-foreground uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.targetMonth} className="row-fade h-10">
                    <td className="px-2">
                      {format(
                        new Date(
                          Number(year),
                          Number(m.targetMonth.split("-")[1]) - 1,
                        ),
                        "MMMM",
                      )}
                    </td>
                    <td className="px-2 text-right">
                      {m.totalDistanceKm.toLocaleString()} km
                    </td>
                    <td className="px-2 text-right">
                      {m.totalLitersConsumed.toFixed(2)} L
                    </td>
                    <td className="px-2 text-right">{m.fuelLogCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
