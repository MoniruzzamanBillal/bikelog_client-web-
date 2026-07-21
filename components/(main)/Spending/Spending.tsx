"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SpendingSummaryView from "./SpendingSummaryView";
import { useFetchData } from "@/hooks/useApi";
import { TSpendingSummary } from "./type/spending.types";

type TPeriod = "month" | "year" | "lifetime";

function formatMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function Spending() {
  const params = useParams();
  const bikeId = params.bikeId as string;

  const now = new Date();
  const [period, setPeriod] = useState<TPeriod>("month");
  const [targetMonth, setTargetMonth] = useState(formatMonth(now));
  const [targetYear, setTargetYear] = useState(now.getFullYear().toString());

  const searchParams = new URLSearchParams();
  searchParams.set("period", period);
  if (period === "month" && targetMonth) searchParams.set("targetMonth", targetMonth);
  if (period === "year" && targetYear) searchParams.set("targetYear", targetYear);

  const queryKey = ["spending", bikeId, period, period === "month" ? targetMonth : "", period === "year" ? targetYear : ""];

  const { data, isLoading } = useFetchData<TSpendingSummary>(
    queryKey,
    `/bikes/${bikeId}/spending-summary?${searchParams.toString()}`,
    { enabled: period === "lifetime" || (period === "month" && !!targetMonth) || (period === "year" && !!targetYear) },
  );

  const spending = data?.data;

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-semibold">Spending</h1>

      <div className="flex gap-2 overflow-x-auto">
        {(["month", "year", "lifetime"] as TPeriod[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap capitalize ${
              period === p
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {period === "month" && (
        <input
          type="month"
          value={targetMonth}
          onChange={(e) => setTargetMonth(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      )}

      {period === "year" && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTargetYear((y) => (Number(y) - 1).toString())}
            className="rounded-lg border border-border p-2 hover:bg-muted"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-base font-semibold">{targetYear}</span>
          <button
            type="button"
            onClick={() => setTargetYear((y) => (Number(y) + 1).toString())}
            className="rounded-lg border border-border p-2 hover:bg-muted"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      <SpendingSummaryView
        totalSpending={spending?.totalSpending ?? 0}
        categoryBreakdown={spending?.categoryBreakdown ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}
