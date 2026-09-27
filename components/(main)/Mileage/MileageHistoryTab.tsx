"use client";

import StateCard from "@/components/shared/StateCard/StateCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetchData } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Gauge } from "lucide-react";
import { TMileageHistoryResponse } from "./type/mileage.types";

export default function MileageHistoryTab({ bikeId }: { bikeId: string }) {
  const { data, isLoading, isError, error, refetch } =
    useFetchData<TMileageHistoryResponse>(
      ["mileage", "history", bikeId],
      `/bikes/${bikeId}/mileage`,
    );
  const history = data?.data;

  if (isLoading) {
    return (
      <>
        <Skeleton className="h-24 rounded-[10px]" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 rounded-[10px]" />
        ))}
      </>
    );
  }

  if (isError) {
    return (
      <StateCard
        variant="error"
        title="Couldn’t load mileage"
        message={error?.message}
        onRetry={() => refetch()}
        className="max-w-none"
      />
    );
  }

  const records = [...(history?.exactRecords ?? [])].sort(
    (a, b) =>
      new Date(b.periodEndDate).getTime() -
      new Date(a.periodEndDate).getTime(),
  );

  if (!history?.approximate && records.length === 0) {
    return (
      <StateCard
        icon={Gauge}
        title="No mileage data yet"
        message="Mileage is calculated when a full-tank fill closes a period. Log two full-tank fills to see your first exact km/l."
        className="max-w-none"
      />
    );
  }

  const maxKmpl = Math.max(...records.map((r) => r.mileageKmPerLiter), 1);

  return (
    <>
      {history?.approximate && (
        <div className="flex items-center justify-between gap-3 rounded-[10px] bg-card px-[18px] py-4 shadow-glow">
          <div>
            <div className="text-xs text-muted-foreground">Rolling average</div>
            <div className="text-[30px] font-medium tracking-[-0.02em] tabular-nums">
              {history.approximate.mileageKmPerLiter.toFixed(2)}
              <span className="ml-1 text-sm font-normal tracking-normal text-muted-foreground">
                km/l
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            Based on last {history.approximate.basedOnFuelLogCount} fills
            <br />
            <span
              className={
                history.approximate.isEstimate ? "text-warning" : "text-success"
              }
            >
              {history.approximate.isEstimate
                ? "Estimate · partial fills"
                : "Exact · full tanks"}
            </span>
          </div>
        </div>
      )}

      <div className="mt-1 text-xs tracking-[0.08em] text-muted-foreground uppercase">
        Exact records
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No exact records yet — log a full-tank fill to close a period.
        </p>
      ) : (
        records.map((record) => (
          <div
            key={record._id}
            className="panel grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3 tabular-nums"
          >
            <div className="text-[12.5px] text-muted-foreground">
              {format(new Date(record.periodStartDate), "dd MMM")} →{" "}
              {format(new Date(record.periodEndDate), "dd MMM yyyy")}
            </div>
            <div className="row-span-2 self-center text-[17px] font-medium">
              {record.mileageKmPerLiter.toFixed(2)}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                km/l
              </span>
            </div>
            <div className="truncate text-[13px]">
              {record.distanceKm.toLocaleString()} km ·{" "}
              {record.litersConsumed.toFixed(2)} L{" "}
              <span className="hidden text-muted-foreground sm:inline">
                · {record.startOdometer.toLocaleString()} →{" "}
                {record.endOdometer.toLocaleString()}
              </span>
            </div>
            <div className="col-span-2 mt-1 h-[3px] rounded-full bg-muted">
              <div
                className={cn("h-[3px] rounded-full bg-chart-1")}
                style={{
                  width: `${Math.round((record.mileageKmPerLiter / maxKmpl) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))
      )}
    </>
  );
}
