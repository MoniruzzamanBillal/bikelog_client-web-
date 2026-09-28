"use client";

import StateCard from "@/components/shared/StateCard/StateCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet } from "lucide-react";
import { TCategoryBreakdown } from "./type/spending.types";

export const CATEGORY_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export const categoryColor = (index: number) =>
  CATEGORY_COLORS[Math.min(index, CATEGORY_COLORS?.length - 1)];

export const formatTaka = (n: number) =>
  `৳${n?.toLocaleString(undefined, {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;

type TProps = {
  periodLabel: string;
  totalSpending: number;
  categoryBreakdown: TCategoryBreakdown[];
  isLoading: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  avgDailyExpense?: number;
  daysElapsed?: number;
};

export default function SpendingSummaryView({
  periodLabel,
  totalSpending,
  categoryBreakdown,
  isLoading,
  isError = false,
  errorMessage,
  onRetry,
  avgDailyExpense,
  daysElapsed,
}: TProps) {
  if (isLoading) {
    return (
      <>
        <Skeleton className="h-[110px] rounded-[10px]" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[52px] rounded-[10px]" />
        ))}
      </>
    );
  }

  if (isError) {
    return (
      <StateCard
        variant="error"
        title="Couldn’t load spending"
        message={errorMessage}
        onRetry={onRetry}
        className="max-w-none"
      />
    );
  }

  const categories = [...categoryBreakdown].sort((a, b) => b?.total - a?.total);

  if (totalSpending === 0 && categories?.length === 0) {
    return (
      <StateCard
        icon={Wallet}
        title={`Nothing spent in ${periodLabel}`}
        message="Fuel logs, maintenance logs and purchased accessories dated in this period will appear here."
        className="max-w-none"
      />
    );
  }

  const max = categories[0]?.total || 1;
  const sum = categories?.reduce((a, c) => a + c?.total, 0) || 1;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-[10px] bg-card p-[18px] shadow-glow">
        <div>
          <div className="text-xs text-muted-foreground">
            Total spending · {periodLabel}
          </div>
          <div className="text-[34px] font-medium tracking-[-0.02em] tabular-nums">
            {formatTaka(totalSpending)}
          </div>
        </div>
        {avgDailyExpense !== undefined &&
          daysElapsed !== undefined &&
          daysElapsed > 0 && (
            <div className="text-right tabular-nums">
              <div className="text-lg">
                ৳{avgDailyExpense?.toFixed(2)}
                <span className="text-xs text-muted-foreground"> / day</span>
              </div>
              <div className="text-xs text-muted-foreground">
                over {daysElapsed} day{daysElapsed === 1 ? "" : "s"} this month
              </div>
            </div>
          )}
      </div>

      <div className="mt-1 text-xs tracking-[0.08em] text-muted-foreground uppercase">
        By category
      </div>

      <div className="panel flex flex-col py-1">
        {categories?.map((cat, i) => (
          <div
            key={cat?.category}
            className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5"
          >
            <span
              className="size-2 rounded-[2px]"
              style={{ background: categoryColor(i) }}
            />
            <span className="truncate text-[13.5px]">{cat?.category}</span>
            <span className="text-[13.5px] font-medium tabular-nums">
              {formatTaka(cat?.total)}
            </span>
            <span />
            <div className="h-[3px] rounded-full bg-muted">
              <div
                className="h-[3px] rounded-full"
                style={{
                  width: `${Math.round((cat?.total / max) * 100)}%`,
                  background: categoryColor(i),
                }}
              />
            </div>
            <span className="text-right text-[11.5px] text-muted-foreground tabular-nums">
              {((cat?.total / sum) * 100)?.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
