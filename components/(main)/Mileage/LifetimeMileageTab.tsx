"use client";

import { useFetchData } from "@/hooks/useApi";
import { TLifetimeMileage } from "./type/mileage.types";

export default function LifetimeMileageTab({ bikeId }: { bikeId: string }) {
  const { data, isLoading } = useFetchData<TLifetimeMileage>(
    ["mileage", "lifetime", bikeId],
    `/bikes/${bikeId}/mileage/lifetime`,
  );
  const lifetime = data?.data;

  if (isLoading) {
    return <p className="text-sm text-surface-text">Loading...</p>;
  }

  if (!lifetime || lifetime.fuelLogCount === 0) {
    return (
      <p className="text-sm text-surface-text">
        No fuel logs yet. Start logging to see lifetime stats.
      </p>
    );
  }

  const avg =
    lifetime.totalLitersConsumed > 0
      ? (lifetime.totalDistanceKm / lifetime.totalLitersConsumed).toFixed(2)
      : "—";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-surface-text">Lifetime Average</p>
      <p className="text-2xl font-semibold">{avg} km/l</p>
      <div className="mt-3 space-y-1 text-sm text-surface-text">
        <p>Total Distance: {lifetime.totalDistanceKm.toLocaleString()} km</p>
        <p>Total Fuel: {lifetime.totalLitersConsumed.toFixed(2)} L</p>
        <p>Fuel Logs: {lifetime.fuelLogCount}</p>
      </div>
    </div>
  );
}
