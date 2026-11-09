"use client";

import StateCard from "@/components/shared/StateCard/StateCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetchData } from "@/hooks/useApi";
import { Gauge } from "lucide-react";
import MileageRecordCard from "./MileageRecordCard";
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
      new Date(b?.periodEndDate).getTime() -
      new Date(a?.periodEndDate).getTime(),
  );

  if (!history?.approximate && records?.length === 0) {
    return (
      <StateCard
        icon={Gauge}
        title="No mileage data yet"
        message="Mileage is calculated when a full-tank fill closes a period. Log two full-tank fills to see your first exact km/l."
        className="max-w-none"
      />
    );
  }

  const maxKmpl = Math.max(...records?.map((r) => r?.mileageKmPerLiter), 1);

  return (
    <>
      {history?.approximate && (
        <div className="flex items-center justify-between gap-3 rounded-[10px] bg-card px-[18px] py-4 shadow-glow">
          <div>
            <div className="text-xs text-muted-foreground">Rolling average</div>
            <div className="text-[30px] font-medium tracking-[-0.02em] tabular-nums">
              {history?.approximate?.mileageKmPerLiter?.toFixed(2)}
              <span className="ml-1 text-sm font-normal tracking-normal text-muted-foreground">
                km/l
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            Based on last {history?.approximate?.basedOnFuelLogCount} fills
            <br />
            <span
              className={
                history?.approximate?.isEstimate ? "text-warning" : "text-success"
              }
            >
              {history?.approximate?.isEstimate
                ? "Estimate · partial fills"
                : "Exact · full tanks"}
            </span>
          </div>
        </div>
      )}

      <div className="mt-1 text-xs tracking-[0.08em] text-muted-foreground uppercase">
        Exact records
      </div>

      {records?.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No exact records yet — log a full-tank fill to close a period.
        </p>
      ) : (
        records?.map((record) => (
          <MileageRecordCard
            key={record?._id}
            record={record}
            maxKmpl={maxKmpl}
          />
        ))
      )}
    </>
  );
}
