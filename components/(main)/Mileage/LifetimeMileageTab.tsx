"use client";

import StateCard from "@/components/shared/StateCard/StateCard";
import StatTile from "@/components/shared/StatTile/StatTile";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetchData } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { Gauge } from "lucide-react";
import { TLifetimeMileage } from "./type/mileage.types";

const useLifetime = (bikeId: string) =>
  useFetchData<TLifetimeMileage>(
    ["mileage", "lifetime", bikeId],
    `/bikes/${bikeId}/mileage/lifetime`,
  );

const getAvg = (l?: TLifetimeMileage) =>
  l && l?.totalLitersConsumed > 0
    ? (l?.totalDistanceKm / l?.totalLitersConsumed)?.toFixed(2)
    : "—";

export default function LifetimeMileageTab({ bikeId }: { bikeId: string }) {
  const { data, isLoading, isError, error, refetch } = useLifetime(bikeId);
  const lifetime = data?.data;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[76px] rounded-[10px]" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <StateCard
        variant="error"
        title="Couldn’t load lifetime stats"
        message={error?.message}
        onRetry={() => refetch()}
        className="max-w-none"
      />
    );
  }

  if (!lifetime || lifetime?.fuelLogCount === 0) {
    return (
      <StateCard
        icon={Gauge}
        title="No fuel logs yet"
        message="Start logging fill-ups to see lifetime stats."
        className="max-w-none"
      />
    );
  }

  const avg = getAvg(lifetime);

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <StatTile
        label="Total distance"
        value={lifetime?.totalDistanceKm?.toLocaleString()}
        unit="km"
      />
      <StatTile
        label="Fuel used"
        value={lifetime?.totalLitersConsumed?.toFixed(2)}
        unit="L"
      />
      <StatTile label="Fill-ups" value={lifetime?.fuelLogCount} />
      <StatTile
        label="Average (derived)"
        value={avg}
        unit={avg === "—" ? undefined : "km/l"}
      />
    </div>
  );
}

/** Desktop side rail on the mileage page — same lifetime query, compact list. */
export function LifetimeRail({
  bikeId,
  className,
}: {
  bikeId: string;
  className?: string;
}) {
  const { data, isLoading } = useLifetime(bikeId);
  const lifetime = data?.data;

  const rows = [
    {
      label: "Distance",
      value: `${(lifetime?.totalDistanceKm ?? 0)?.toLocaleString()} km`,
    },
    {
      label: "Fuel used",
      value: `${(lifetime?.totalLitersConsumed ?? 0)?.toFixed(2)} L`,
    },
    { label: "Fill-ups", value: `${lifetime?.fuelLogCount ?? 0}` },
    {
      label: "Average",
      value: getAvg(lifetime) === "—" ? "—" : `${getAvg(lifetime)} km/l`,
    },
  ];

  return (
    <div
      className={cn(
        "panel flex-col gap-2.5 px-4 py-3.5 text-sm tabular-nums",
        className,
      )}
    >
      <div className="text-xs tracking-[0.08em] text-muted-foreground uppercase">
        Lifetime
      </div>
      {rows?.map((r) => (
        <div key={r?.label} className="flex justify-between">
          <span className="text-muted-foreground">{r?.label}</span>
          {isLoading ? <Skeleton className="h-4 w-16" /> : <span>{r?.value}</span>}
        </div>
      ))}
    </div>
  );
}
