"use client";

import { TCategoryBreakdown } from "./type/spending.types";

type TProps = {
  totalSpending: number;
  categoryBreakdown: TCategoryBreakdown[];
  isLoading: boolean;
};

export default function SpendingSummaryView({
  totalSpending,
  categoryBreakdown,
  isLoading,
}: TProps) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Total Spending</p>
        <p className="text-2xl font-semibold">
          ৳{totalSpending.toLocaleString()}
        </p>
      </div>

      {categoryBreakdown.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">By Category</p>
          {categoryBreakdown.map((cat) => (
            <div
              key={cat.category}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm"
            >
              <span>{cat.category}</span>
              <span className="font-medium">
                ৳{cat.total.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No spending data yet.
        </p>
      )}
    </div>
  );
}