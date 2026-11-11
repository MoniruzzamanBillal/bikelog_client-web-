"use client";

import StateCard from "@/components/shared/StateCard/StateCard";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parse } from "date-fns";
import { ChevronDown, Wallet } from "lucide-react";
import { useState } from "react";
import { categoryColor, formatTaka } from "./SpendingSummaryView";
import { TSpendingCategoryGroup } from "./type/spending.types";

// ! Date-only render path: parse the calendar date (YYYY-MM-DD) literally instead of
// ! `new Date(iso)` in local time, so a UTC-midnight timestamp never slips a day (spec 38).
const formatRecordDate = (iso: string) =>
  format(parse(iso.slice(0, 10), "yyyy-MM-dd", new Date()), "dd MMM");

type TProps = {
  periodLabel: string;
  totalSpending: number;
  categories: TSpendingCategoryGroup[];
  isLoading: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  avgDailyExpense?: number;
  daysElapsed?: number;
};

// ! Open state is local; the caller passes `key={targetMonth}` so a month change remounts
// ! this component and collapses every row — no cross-month carry-over, no reset effect.
export default function MonthlySpendingBreakdown({
  periodLabel,
  totalSpending,
  categories,
  isLoading,
  isError = false,
  errorMessage,
  onRetry,
  avgDailyExpense,
  daysElapsed,
}: TProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

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

  const sorted = [...categories].sort((a, b) => b?.total - a?.total);

  if (totalSpending === 0 && sorted?.length === 0) {
    return (
      <StateCard
        icon={Wallet}
        title={`Nothing spent in ${periodLabel}`}
        message="Fuel logs, maintenance logs and purchased accessories dated in this period will appear here."
        className="max-w-none"
      />
    );
  }

  const max = sorted[0]?.total || 1;

  return (
    <>
      {/* ── Total panel (unchanged from SpendingSummaryView) ── */}
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
        By category · click to expand
      </div>

      <div className="panel flex flex-col py-1">
        {sorted?.map((cat, i) => {
          const isOpen = !!open[cat?.category];
          const records = [...(cat?.records ?? [])].sort(
            (a, b) => b?.date?.localeCompare(a?.date),
          );
          return (
            <div key={cat?.category} className="border-b border-border/40 last:border-b-0">
              {/* ── collapsed header (click toggles) ── */}
              <button
                type="button"
                onClick={() =>
                  setOpen((prev) => ({
                    ...prev,
                    [cat?.category]: !prev[cat?.category],
                  }))
                }
                aria-expanded={isOpen}
                className="grid w-full grid-cols-[10px_minmax(0,1fr)_auto_16px] items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left hover:bg-muted/30"
              >
                <span
                  className="size-2 rounded-[2px]"
                  style={{ background: categoryColor(i) }}
                />
                <span className="truncate text-[13.5px]">{cat?.category}</span>
                <span className="text-[13.5px] font-medium tabular-nums">
                  {formatTaka(cat?.total)}
                </span>
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
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
                  {((cat?.total / (totalSpending || 1)) * 100)?.toFixed(1)}%
                </span>
                <span />
              </button>

              {/* ── expanded body: line-item records ── */}
              {isOpen && (
                <div className="flex flex-col gap-0.5 px-4 pb-2.5">
                  {records?.map((rec, ri) => {
                    const secondary = rec?.vendor ?? rec?.remarks;
                    return (
                      <div
                        key={ri}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-3 rounded-md bg-muted/20 px-3 py-1.5"
                      >
                        <span className="text-[11.5px] text-muted-foreground tabular-nums">
                          {formatRecordDate(rec?.date)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-[12.5px]">
                            {rec?.description}
                          </div>
                          {secondary && (
                            <div className="truncate text-[11px] text-muted-foreground">
                              {secondary}
                            </div>
                          )}
                        </div>
                        <span className="text-[12.5px] font-medium tabular-nums">
                          {formatTaka(rec?.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
