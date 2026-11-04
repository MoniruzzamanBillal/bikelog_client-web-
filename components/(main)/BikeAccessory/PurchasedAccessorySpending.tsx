"use client";

import StateCard from "@/components/shared/StateCard/StateCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetchData } from "@/hooks/useApi";
import { format, parse } from "date-fns";
import { ShoppingBag } from "lucide-react";
import { formatTaka } from "../Spending/SpendingSummaryView";
import BikeAccessoryCard from "./BikeAccessoryCard";
import {
  TAccessorySpendingSummary,
  TBikeAccessory,
} from "./type/bike-accessory.types";

type TProps = {
  bikeId: string;
  onEdit: (accessory: TBikeAccessory) => void;
  onDelete: (accessory: TBikeAccessory) => void;
  addButton: React.ReactNode;
};

// "2026-11" -> "November 2026"
const monthLabel = (month: string) =>
  format(parse(month, "yyyy-MM", new Date()), "MMMM yyyy");

export default function PurchasedAccessorySpending({
  bikeId,
  onEdit,
  onDelete,
  addButton,
}: TProps) {
  const { data, isLoading, isError, error, refetch } =
    useFetchData<TAccessorySpendingSummary>(
      ["accessoryMonthSpending", bikeId],
      `/bikes/${bikeId}/accessories/spending-summary`,
    );

  if (isLoading) {
    return (
      <>
        <Skeleton className="h-[86px] rounded-[10px]" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-[10px]" />
        ))}
      </>
    );
  }

  if (isError) {
    return (
      <StateCard
        variant="error"
        title="Couldn’t load purchases"
        message={error?.message}
        onRetry={() => refetch()}
        className="max-w-none"
      />
    );
  }

  const summary = data?.data;
  const months = summary?.months ?? [];

  if (months?.length === 0) {
    return (
      <StateCard
        icon={ShoppingBag}
        title="No purchases yet"
        message="Mark a wishlist accessory as purchased and its price shows up here, grouped by the month you bought it."
        action={addButton}
      />
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-stretch gap-2.5">
        <div className="flex-1 rounded-[10px] bg-card p-[18px] shadow-glow">
          <div className="text-xs text-muted-foreground">This month</div>
          <div className="text-[28px] font-medium tracking-[-0.02em] tabular-nums">
            {formatTaka(summary?.currentMonthTotal ?? 0)}
          </div>
        </div>
        <div className="flex-1 rounded-[10px] bg-card p-[18px] shadow-glow">
          <div className="text-xs text-muted-foreground">All time</div>
          <div className="text-[28px] font-medium tracking-[-0.02em] tabular-nums">
            {formatTaka(summary?.allTimeTotal ?? 0)}
          </div>
        </div>
      </div>

      {months?.map((group) => (
        <section key={group?.month} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 text-xs tracking-[0.08em] uppercase">
            <span className="text-foreground">{monthLabel(group?.month)}</span>
            <span className="tracking-normal tabular-nums text-foreground">
              {formatTaka(group?.total)}
            </span>
          </div>
          {group?.accessories?.length === 0 ? (
            <div className="panel px-4 py-3 text-[12.5px] text-muted-foreground italic">
              No purchases this month
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 xl:grid-cols-3">
              {group?.accessories?.map((accessory) => (
                <BikeAccessoryCard
                  key={accessory?._id}
                  accessory={accessory}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  );
}
