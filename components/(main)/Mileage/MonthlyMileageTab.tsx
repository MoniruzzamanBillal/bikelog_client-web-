"use client";

import PeriodStepper from "@/components/shared/PeriodStepper/PeriodStepper";
import StateCard from "@/components/shared/StateCard/StateCard";
import StatTile from "@/components/shared/StatTile/StatTile";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetchData } from "@/hooks/useApi";
import { addMonths, format, isSameMonth, parse } from "date-fns";
import { CalendarDays, Gauge } from "lucide-react";
import { useState } from "react";
import { TMonthlyMileage } from "./type/mileage.types";

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
    monthly?.totalLitersConsumed && monthly.totalLitersConsumed > 0
      ? (monthly.totalDistanceKm / monthly.totalLitersConsumed).toFixed(2)
      : "—";

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
              onChange={(e) => e.target.value && setTargetMonth(e.target.value)}
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
      ) : monthly?.fuelLogCount && monthly.fuelLogCount > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
          <StatTile
            label="Distance"
            value={monthly.totalDistanceKm.toLocaleString()}
            unit="km"
          />
          <StatTile
            label="Fuel used"
            value={monthly.totalLitersConsumed.toFixed(2)}
            unit="L"
          />
          <StatTile label="Fill-ups" value={monthly.fuelLogCount} />
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
    </>
  );
}
