"use client";

import PeriodStepper from "@/components/shared/PeriodStepper/PeriodStepper";
import StateCard from "@/components/shared/StateCard/StateCard";
import StatTile from "@/components/shared/StatTile/StatTile";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetchData } from "@/hooks/useApi";
import { addMonths, format, isSameMonth, parse } from "date-fns";
import { CalendarDays, Gauge } from "lucide-react";
import { useState } from "react";
import MileageRecordCard from "./MileageRecordCard";
import {
  TMileageHistoryResponse,
  TMonthlyMileage,
} from "./type/mileage.types";

function formatMonth(date: Date): string {
  return format(date, "yyyy-MM");
}

export default function MonthlyMileageTab({ bikeId }: { bikeId: string }) {
  const now = new Date();
  const [targetMonth, setTargetMonth] = useState(formatMonth(now));
  const monthDate = parse(targetMonth, "yyyy-MM", new Date());

  const { data, isLoading, isError, error, refetch } =
    useFetchData<TMonthlyMileage>(
      ["mileage", "monthly", bikeId, targetMonth],
      `/bikes/${bikeId}/mileage/monthly?targetMonth=${targetMonth}`,
      { enabled: !!targetMonth },
    );
  const monthly = data?.data;

  const avg =
    monthly?.totalLitersConsumed && monthly?.totalLitersConsumed > 0
      ? (monthly?.totalDistanceKm / monthly?.totalLitersConsumed)?.toFixed(2)
      : "—";

  // FILL-UP RECORDS: the exact-mileage records whose period *closed* in this month.
  // Reuse the History query (react-query dedupes — no new endpoint) and filter
  // client-side on periodEndDate's YYYY-MM.
  const { data: historyData } = useFetchData<TMileageHistoryResponse>(
    ["mileage", "history", bikeId],
    `/bikes/${bikeId}/mileage`,
  );
  const monthRecords = (historyData?.data?.exactRecords ?? [])
    .filter((r) => format(new Date(r?.periodEndDate), "yyyy-MM") === targetMonth)
    .sort(
      (a, b) =>
        new Date(b?.periodEndDate).getTime() -
        new Date(a?.periodEndDate).getTime(),
    );
  const monthMaxKmpl = Math.max(
    ...monthRecords.map((r) => r?.mileageKmPerLiter),
    1,
  );
  const hasFuelLogs = !!monthly?.fuelLogCount && monthly?.fuelLogCount > 0;

  return (
    <>
      <PeriodStepper
        boxed
        onPrev={() => setTargetMonth(formatMonth(addMonths(monthDate, -1)))}
        onNext={() => setTargetMonth(formatMonth(addMonths(monthDate, 1)))}
        disableNext={isSameMonth(monthDate, now)}
        label={
          <label className="relative flex w-full cursor-pointer items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            {format(monthDate, "MMMM yyyy")}
            {/* native month picker, visually hidden behind the label */}
            <input
              type="month"
              value={targetMonth}
              max={formatMonth(now)}
              onChange={(e) => e?.target?.value && setTargetMonth(e?.target?.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Pick a month"
            />
          </label>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[76px] rounded-[10px]" />
          ))}
        </div>
      ) : isError ? (
        <StateCard
          variant="error"
          title="Couldn’t load this month"
          message={error?.message}
          onRetry={() => refetch()}
          className="max-w-none"
        />
      ) : hasFuelLogs ? (
        <div className="grid grid-cols-2 gap-2.5">
          <StatTile
            label="Distance"
            value={monthly?.totalDistanceKm?.toLocaleString()}
            unit="km"
          />
          <StatTile
            label="Fuel used"
            value={monthly?.totalLitersConsumed?.toFixed(2)}
            unit="L"
          />
          <StatTile label="Fill-ups" value={monthly?.fuelLogCount} />
          <StatTile
            label="Average (derived)"
            value={avg}
            unit={avg === "—" ? undefined : "km/l"}
          />
        </div>
      ) : (
        <StateCard
          icon={Gauge}
          title="No fuel logs this month"
          message={`Nothing was logged in ${format(monthDate, "MMMM yyyy")}.`}
          className="max-w-none"
        />
      )}

      {!isLoading && !isError && hasFuelLogs && (
        <>
          <div className="mt-1 text-xs tracking-[0.08em] text-muted-foreground uppercase">
            Fill-up records
          </div>
          {monthRecords.length > 0 ? (
            monthRecords.map((record) => (
              <MileageRecordCard
                key={record?._id}
                record={record}
                maxKmpl={monthMaxKmpl}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No exact record closed this month.
            </p>
          )}
        </>
      )}
    </>
  );
}
