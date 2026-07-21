"use client";

import { useFetchData } from "@/hooks/useApi";
import { useState } from "react";
import { TMonthlyMileage } from "./type/mileage.types";

function formatMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function MonthlyMileageTab({ bikeId }: { bikeId: string }) {
  const now = new Date();
  const [targetMonth, setTargetMonth] = useState(formatMonth(now));

  const { data, isLoading } = useFetchData<TMonthlyMileage>(
    ["mileage", "monthly", bikeId, targetMonth],
    `/bikes/${bikeId}/mileage/monthly?targetMonth=${targetMonth}`,
    { enabled: !!targetMonth },
  );
  const monthly = data?.data;

  const avg =
    monthly?.totalLitersConsumed && monthly.totalLitersConsumed > 0
      ? (monthly.totalDistanceKm / monthly.totalLitersConsumed).toFixed(2)
      : "—";

  return (
    <div className="space-y-4">
      <input
        type="month"
        value={targetMonth}
        onChange={(e) => setTargetMonth(e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : monthly?.fuelLogCount && monthly.fuelLogCount > 0 ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-surface-text">Average Mileage</p>
          <p className="text-2xl font-semibold">{avg} km/l</p>
          <div className="mt-3 space-y-1 text-sm text-surface-text">
            <p>Distance: {monthly.totalDistanceKm.toLocaleString()} km</p>
            <p>Fuel: {monthly.totalLitersConsumed.toFixed(2)} L</p>
            <p>Logs: {monthly.fuelLogCount}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-surface-text">
          No fuel logs for this month.
        </p>
      )}
    </div>
  );
}
