"use client";

import { apiGet } from "@/utils/api";
import { TgenericResponse } from "@/lib/apiResponse";
import { useFetchData } from "@/hooks/useApi";
import { format, parse } from "date-fns";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import AiSpendingInsightCard from "./AiSpendingInsightCard";
import SpendingSummaryView from "./SpendingSummaryView";
import SpendingTrendChart from "./SpendingTrendChart";
import { generateSpendingPdf } from "./utils/generateSpendingPdf";
import { TSpendingDetails, TSpendingSummary } from "./type/spending.types";

type TPeriod = "month" | "year" | "lifetime" | "trend";

function formatMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getPeriodLabel(
  period: TPeriod,
  targetMonth: string,
  targetYear: string,
): string {
  if (period === "month") {
    return format(parse(targetMonth, "yyyy-MM", new Date()), "MMMM yyyy");
  }
  if (period === "year") return targetYear;
  return "Lifetime";
}

export default function Spending() {
  const params = useParams();
  const bikeId = params.bikeId as string;

  const now = new Date();
  const [period, setPeriod] = useState<TPeriod>("month");
  const [targetMonth, setTargetMonth] = useState(formatMonth(now));
  const [targetYear, setTargetYear] = useState(now.getFullYear().toString());
  const [isExporting, setIsExporting] = useState(false);

  const searchParams = new URLSearchParams();
  searchParams.set("period", period);
  if (period === "month" && targetMonth)
    searchParams.set("targetMonth", targetMonth);
  if (period === "year" && targetYear)
    searchParams.set("targetYear", targetYear);

  const queryKey = [
    "spending",
    bikeId,
    period,
    period === "month" ? targetMonth : "",
    period === "year" ? targetYear : "",
  ];

  const { data, isLoading } = useFetchData<TSpendingSummary>(
    queryKey,
    `/bikes/${bikeId}/spending-summary?${searchParams.toString()}`,
    {
      enabled:
        period === "lifetime" ||
        (period === "month" && !!targetMonth) ||
        (period === "year" && !!targetYear),
    },
  );

  const spending = data?.data;

  const handleExportPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const response = (await apiGet(
        `/bikes/${bikeId}/spending-summary/details?${searchParams.toString()}`,
      )) as TgenericResponse<TSpendingDetails>;
      generateSpendingPdf(
        response.data,
        getPeriodLabel(period, targetMonth, targetYear),
      );
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Something went wrong!!", { duration: 2000 });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-semibold">Spending</h1>

      <AiSpendingInsightCard bikeId={bikeId} />

      <div className="flex gap-2 overflow-x-auto">
        {(["month", "year", "lifetime", "trend"] as TPeriod[]).map((p) => (
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

      {period !== "trend" && (
        <div className="flex flex-wrap items-center gap-2">
          {period === "month" && (
            <input
              type="month"
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          )}

          {period === "year" && (
            <div className="flex flex-1 items-center gap-3">
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

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {isExporting ? "Exporting..." : "Export PDF"}
          </button>
        </div>
      )}

      {period === "trend" ? (
        <SpendingTrendChart bikeId={bikeId} />
      ) : (
        <SpendingSummaryView
          totalSpending={spending?.totalSpending ?? 0}
          categoryBreakdown={spending?.categoryBreakdown ?? []}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
