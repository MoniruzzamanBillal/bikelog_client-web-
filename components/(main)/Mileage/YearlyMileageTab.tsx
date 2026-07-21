"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFetchData } from "@/hooks/useApi";
import { TYearlyMileage } from "./type/mileage.types";

export default function YearlyMileageTab({ bikeId }: { bikeId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear().toString());

  const { data, isLoading } = useFetchData<TYearlyMileage>(
    ["mileage", "yearly", bikeId, year],
    `/bikes/${bikeId}/mileage/yearly?targetYear=${year}`,
    { enabled: !!year },
  );
  const yearly = data?.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setYear((y) => (Number(y) - 1).toString())}
          className="rounded-lg border border-border p-2 hover:bg-muted"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-base font-semibold">{year}</span>
        <button
          type="button"
          onClick={() => setYear((y) => (Number(y) + 1).toString())}
          className="rounded-lg border border-border p-2 hover:bg-muted"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : yearly?.monthlySummary && yearly.monthlySummary.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {yearly.monthlySummary.map((m) => {
            const avg =
              m.totalLitersConsumed > 0
                ? (m.totalDistanceKm / m.totalLitersConsumed).toFixed(2)
                : "—";
            const monthIndex = Number(m.targetMonth.split("-")[1]) - 1;
            return (
              <div
                key={m.targetMonth}
                className="rounded-lg border border-border bg-card p-3"
              >
                <p className="text-sm font-medium">
                  {new Date(Number(year), monthIndex).toLocaleString(
                    "default",
                    { month: "long" },
                  )}
                </p>
                <p className="mt-1 text-lg font-semibold">{avg} km/l</p>
                <p className="text-xs text-muted-foreground">
                  {m.totalDistanceKm.toLocaleString()} km ·{" "}
                  {m.totalLitersConsumed.toFixed(2)} L · {m.fuelLogCount} logs
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No fuel logs for {year}.
        </p>
      )}
    </div>
  );
}