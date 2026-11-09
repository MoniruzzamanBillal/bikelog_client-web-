"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fuelCostStr, perUnitStr } from "./mileageMoney";
import { TMileageRecord } from "./type/mileage.types";

type TProps = {
  record: TMileageRecord;
  // caller's best km/l — the proportional bar scales to it, so a card reads the same
  // whether it's in the History list or a single month's fill-up list.
  maxKmpl: number;
};

/** One exact-mileage record: period · figures · km/l · cost line · proportional bar. */
export default function MileageRecordCard({ record, maxKmpl }: TProps) {
  const cost = record?.totalFuelCost;

  return (
    <div className="panel grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3 tabular-nums">
      <div className="text-[12.5px] text-muted-foreground">
        {format(new Date(record?.periodStartDate), "dd MMM")} →{" "}
        {format(new Date(record?.periodEndDate), "dd MMM yyyy")}
      </div>
      <div className="row-span-3 self-center text-[17px] font-medium">
        {record?.mileageKmPerLiter?.toFixed(2)}
        <span className="ml-0.5 text-xs font-normal text-muted-foreground">
          km/l
        </span>
      </div>
      <div className="truncate text-[13px]">
        {record?.distanceKm?.toLocaleString()} km ·{" "}
        {record?.litersConsumed?.toFixed(2)} L{" "}
        <span className="hidden text-muted-foreground sm:inline">
          · {record?.startOdometer?.toLocaleString()} →{" "}
          {record?.endOdometer?.toLocaleString()}
        </span>
      </div>
      {/* cost line — a bit small, a bit brighter than the greyed detail line above */}
      <div className="text-[11.5px] text-foreground/90">
        Fuel cost {fuelCostStr(cost)} · {perUnitStr(cost, record?.distanceKm)}/km ·{" "}
        {perUnitStr(cost, record?.litersConsumed)}/L
      </div>
      <div className="col-span-2 mt-1 h-[3px] rounded-full bg-muted">
        <div
          className={cn("h-[3px] rounded-full bg-chart-1")}
          style={{
            width: `${Math.round((record?.mileageKmPerLiter / maxKmpl) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
