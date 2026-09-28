"use client";

import StatusTag from "@/components/shared/StatusTag/StatusTag";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { TBike } from "./type/bike.types";

export default function BikeCard({
  bike,
  highlight = false,
}: {
  bike: TBike;
  highlight?: boolean;
}) {
  const logged = bike.currentOdometer - (bike.initialOdometer ?? 0);
  const since = bike.purchaseDate
    ? format(new Date(bike.purchaseDate), "MMM yyyy")
    : "—";

  return (
    <Link
      href={`/bikes/${bike._id}`}
      className={cn(
        "group flex flex-col gap-2.5 rounded-[10px] bg-card px-4 py-3.5 transition-shadow lg:gap-3.5 lg:p-[18px]",
        highlight ? "shadow-glow" : "shadow-sm hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-medium tracking-[-0.01em] lg:text-[17px]">
            {bike.nickname}
          </div>
          <div className="truncate text-[12.5px] text-muted-foreground lg:text-[13px]">
            {bike.brand} {bike.model}
          </div>
        </div>
        <ChevronRight className="size-[18px] shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      {/* odometer — mobile keeps the reg tag beside it, desktop moves it down */}
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="hidden text-[11px] tracking-[0.08em] text-muted-foreground uppercase lg:block">
            Odometer
          </div>
          <div className="text-2xl font-medium tracking-[-0.02em] tabular-nums lg:mt-0.5 lg:text-[30px]">
            {bike.currentOdometer.toLocaleString()}
            <span className="ml-1 text-[13px] font-normal tracking-normal text-muted-foreground lg:text-sm">
              km
            </span>
          </div>
        </div>
        <StatusTag className="max-w-[45%] truncate lg:hidden">
          {bike.registrationNumber}
        </StatusTag>
      </div>

      <div className="rule-fade hidden lg:block" />

      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted-foreground tabular-nums lg:grid lg:grid-cols-3 lg:gap-2">
        <div>
          <span className="lg:block">Logged</span>{" "}
          <span className="text-muted-foreground lg:mt-0.5 lg:block lg:text-foreground">
            {logged.toLocaleString()} km
          </span>
        </div>
        <div>
          <span className="lg:block">Tank</span>{" "}
          <span className="lg:mt-0.5 lg:block lg:text-foreground">
            {bike.fuelTankCapacityLiters} L
          </span>
        </div>
        <div>
          <span className="lg:block">Since</span>{" "}
          <span className="lg:mt-0.5 lg:block lg:text-foreground">{since}</span>
        </div>
      </div>

      <StatusTag className="hidden self-start lg:inline-flex">
        {bike.registrationNumber}
      </StatusTag>
    </Link>
  );
}
