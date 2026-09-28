"use client";

import PageHeader from "@/components/shared/PageHeader/PageHeader";
import PeriodStepper from "@/components/shared/PeriodStepper/PeriodStepper";
import SegmentedTabs from "@/components/shared/SegmentedTabs/SegmentedTabs";
import { Button } from "@/components/ui/button";
import { useFetchData } from "@/hooks/useApi";
import { TgenericResponse } from "@/lib/apiResponse";
import { apiGet } from "@/utils/api";
import { format, getDate, getDaysInMonth, isSameMonth, parse } from "date-fns";
import { CalendarDays, Download, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TBike } from "../Bike/type/bike.types";
import AiSpendingInsightCard from "./AiSpendingInsightCard";
import SpendingSummaryView from "./SpendingSummaryView";
import SpendingTrendChart from "./SpendingTrendChart";
import { TSpendingDetails, TSpendingSummary } from "./type/spending.types";
import { generateSpendingPdf } from "./utils/generateSpendingPdf";

type TPeriod = "month" | "year" | "lifetime" | "trend";

const periodOptions: { value: TPeriod; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "lifetime", label: "Lifetime" },
  { value: "trend", label: "Trend" },
];

function formatMonth(d: Date): string {
  const y = d?.getFullYear();
  const m = String(d?.getMonth() + 1).padStart(2, "0");
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

function getElapsedDaysInMonth(targetMonth: string): number {
  const monthDate = parse(targetMonth, "yyyy-MM", new Date());
  const now = new Date();

  if (isSameMonth(monthDate, now)) {
    return getDate(now);
  }
  if (monthDate > now) {
    return 0;
  }
  return getDaysInMonth(monthDate);
}

export default function Spending() {
  const params = useParams();
  const bikeId = params?.bikeId as string;

  const now = new Date();
  const [period, setPeriod] = useState<TPeriod>("month");
  const [targetMonth, setTargetMonth] = useState(formatMonth(now));
  const [targetYear, setTargetYear] = useState(now?.getFullYear()?.toString());
  const [isExporting, setIsExporting] = useState(false);

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
  );

  const searchParams = new URLSearchParams();
  searchParams?.set("period", period);
  if (period === "month" && targetMonth)
    searchParams?.set("targetMonth", targetMonth);
  if (period === "year" && targetYear)
    searchParams?.set("targetYear", targetYear);

  const queryKey = [
    "spending",
    bikeId,
    period,
    period === "month" ? targetMonth : "",
    period === "year" ? targetYear : "",
  ];

  const { data, isLoading, isError, error, refetch } =
    useFetchData<TSpendingSummary>(
      queryKey,
      `/bikes/${bikeId}/spending-summary?${searchParams?.toString()}`,
      {
        enabled:
          period === "lifetime" ||
          (period === "month" && !!targetMonth) ||
          (period === "year" && !!targetYear),
      },
    );

  const spending = data?.data;

  const daysElapsed =
    period === "month" ? getElapsedDaysInMonth(targetMonth) : 0;
  const avgDailyExpense =
    daysElapsed > 0 ? (spending?.totalSpending ?? 0) / daysElapsed : 0;

  const handleExportPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const response = (await apiGet(
        `/bikes/${bikeId}/spending-summary/details?${searchParams?.toString()}`,
      )) as TgenericResponse<TSpendingDetails>;
      generateSpendingPdf(
        response?.data,
        getPeriodLabel(period, targetMonth, targetYear),
      );
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Something went wrong!!", { duration: 2000 });
    } finally {
      setIsExporting(false);
    }
  };

  const monthDate = parse(targetMonth, "yyyy-MM", new Date());

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        className="hidden lg:flex"
        title="Spending"
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: bikeData?.data?.nickname ?? "Bike",
            href: `/bikes/${bikeId}`,
          },
          { label: "Spending" },
        ]}
      />

      {/* ── period controls ── */}
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedTabs
          value={period}
          onChange={setPeriod}
          options={periodOptions}
        />

        {period === "month" && (
          <label className="relative flex h-9 min-w-0 flex-[0_1_190px] cursor-pointer items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-sm tabular-nums hover:border-foreground/40">
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{format(monthDate, "MMMM yyyy")}</span>
            <input
              type="month"
              value={targetMonth}
              onChange={(e) => e?.target?.value && setTargetMonth(e?.target?.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Pick a month"
            />
          </label>
        )}

        {period === "year" && (
          <PeriodStepper
            label={<span className="text-sm">{targetYear}</span>}
            onPrev={() => setTargetYear((y) => (Number(y) - 1)?.toString())}
            onNext={() => setTargetYear((y) => (Number(y) + 1)?.toString())}
            disableNext={Number(targetYear) >= now?.getFullYear()}
            className="[&_button]:size-9"
          />
        )}

        {period !== "trend" && (
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="ml-auto"
          >
            {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
            {isExporting ? (
              "Exporting…"
            ) : (
              <>
                <span className="lg:hidden">PDF</span>
                <span className="hidden lg:inline">Export PDF</span>
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          {period === "trend" ? (
            <SpendingTrendChart bikeId={bikeId} />
          ) : (
            <SpendingSummaryView
              periodLabel={getPeriodLabel(period, targetMonth, targetYear)}
              totalSpending={spending?.totalSpending ?? 0}
              categoryBreakdown={spending?.categoryBreakdown ?? []}
              isLoading={isLoading}
              isError={isError}
              errorMessage={error?.message}
              onRetry={() => refetch()}
              {...(period === "month" && daysElapsed > 0
                ? { avgDailyExpense, daysElapsed }
                : {})}
            />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <AiSpendingInsightCard bikeId={bikeId} />
          {period !== "trend" && (
            <SpendingTrendChart
              bikeId={bikeId}
              variant="rail"
              onOpenTrend={() => setPeriod("trend")}
              className="hidden lg:flex"
            />
          )}
        </div>
      </div>
    </div>
  );
}
