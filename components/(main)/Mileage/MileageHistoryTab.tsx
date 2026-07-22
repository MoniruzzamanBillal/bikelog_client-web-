"use client";

import { useFetchData } from "@/hooks/useApi";
import { format } from "date-fns";
import { TMileageHistoryResponse } from "./type/mileage.types";

export default function MileageHistoryTab({ bikeId }: { bikeId: string }) {
  const { data, isLoading } = useFetchData<TMileageHistoryResponse>(
    ["mileage", "history", bikeId],
    `/bikes/${bikeId}/mileage`,
  );
  const history = data?.data;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      {history?.approximate ? (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm text-surface-text">
            ~Approx {history.approximate.mileageKmPerLiter.toFixed(2)} km/l
            <span className="text-xs">
              {" "}
              (based on last {history.approximate.basedOnFuelLogCount} fills)
            </span>
          </p>
          {history.approximate.isEstimate && (
            <p className="text-xs text-surface-text-muted">
              Estimated from partial fills
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-surface-text">
          No mileage data yet. Log a full-tank fill to see exact records.
        </p>
      )}

      {history?.exactRecords && history.exactRecords.length > 0 ? (
        <div className="space-y-3">
          {history.exactRecords.map((record) => (
            <div
              key={record._id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <p className="text-sm text-surface-text">
                {format(new Date(record.periodStartDate), "dd-MMM-yyyy")} —{" "}
                {format(new Date(record.periodEndDate), "dd-MMM-yyyy")}
              </p>
              <p className="mt-1 text-lg font-semibold">
                {record.mileageKmPerLiter.toFixed(2)} km/l
              </p>
              <p className="text-sm text-surface-text">
                {record.distanceKm.toLocaleString()} km ·{" "}
                {record.litersConsumed.toFixed(2)} L
              </p>
            </div>
          ))}
        </div>
      ) : (
        !history?.approximate && (
          <p className="text-sm text-muted-foreground">
            No exact mileage records yet.
          </p>
        )
      )}
    </div>
  );
}
