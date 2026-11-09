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
import MonthlySpendingBreakdown from "./MonthlySpendingBreakdown";
import PeriodSpendingBreakdown from "./PeriodSpendingBreakdown";
import SpendingTrendChart from "./SpendingTrendChart";
import {
  TMonthlyCategoryBreakdown,
  TPeriodCategoryBreakdown,
  TSpendingDetails,
} from "./type/spending.types";
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

// Mirrors getElapsedDaysInMonth: full days for a past year, day-of-year for the current
// year, 0 for a future year.
function getElapsedDaysInYear(targetYear: string): number {
  const year = Number(targetYear);
  const now = new Date();
  const currentYear = now?.getFullYear();
  if (!year || year > currentYear) return 0;
  if (year < currentYear) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeap ? 366 : 365;
  }
  const yearStart = new Date(currentYear, 0, 0);
  return Math.floor((now.getTime() - yearStart.getTime()) / 86_400_000);
}

// Days since the bike's ownership start (purchaseDate); 0 when absent/invalid so the
// lifetime per-day line can be guarded off (never ৳NaN).
function getDaysSinceOwnership(purchaseDate?: string): number {
  if (!purchaseDate) return 0;
  const start = new Date(purchaseDate);
  if (Number.isNaN(start.getTime())) return 0;
  const days = Math.floor((Date.now() - start.getTime()) / 86_400_000);
  return days > 0 ? days : 0;
}

export default function Spending() {
  const params = useParams();
  const bikeId = params?.bikeId as string;

  const now = new Date();
  const [period, setPeriod] = useState<TPeriod>("month");
  const [targetMonth, setTargetMonth] = useState(formatMonth(now));
  const [targetYear, setTargetYear] = useState(now?.getFullYear()?.toString());
  // Trend tab has its own year stepper, independent of the Year tab's.
  const [trendYear, setTrendYear] = useState(now?.getFullYear()?.toString());
  const [isExporting, setIsExporting] = useState(false);

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
  );

  // Query string reused by the PDF export (unchanged — it still hits /details).
  const searchParams = new URLSearchParams();
  searchParams?.set("period", period);
  if (period === "month" && targetMonth)
    searchParams?.set("targetMonth", targetMonth);
  if (period === "year" && targetYear)
    searchParams?.set("targetYear", targetYear);

  // ── Month → category drill-down (server spec 60) ──
  const monthQuery = useFetchData<TMonthlyCategoryBreakdown>(
    ["spending", bikeId, "month-breakdown", targetMonth],
    `/bikes/${bikeId}/spending-summary/monthly-breakdown?targetMonth=${targetMonth}`,
    { enabled: period === "month" && !!targetMonth },
  );

  // ── Year → per-month buckets (server spec 61) ──
  const yearQuery = useFetchData<TPeriodCategoryBreakdown>(
    ["spending", bikeId, "year-breakdown", targetYear],
    `/bikes/${bikeId}/spending-summary/period-breakdown?period=year&targetYear=${targetYear}`,
    { enabled: period === "year" && !!targetYear },
  );

  // ── Lifetime → per-year buckets (server spec 61) ──
  const lifetimeQuery = useFetchData<TPeriodCategoryBreakdown>(
    ["spending", bikeId, "lifetime-breakdown"],
    `/bikes/${bikeId}/spending-summary/period-breakdown?period=lifetime`,
    { enabled: period === "lifetime" },
  );

  const monthBreakdown = monthQuery?.data?.data;
  const yearBreakdown = yearQuery?.data?.data;
  const lifetimeBreakdown = lifetimeQuery?.data?.data;

  // ── Per-day figures ──
  const monthDaysElapsed = getElapsedDaysInMonth(targetMonth);
  const monthAvgDaily =
    monthDaysElapsed > 0
      ? (monthBreakdown?.totalSpending ?? 0) / monthDaysElapsed
      : 0;

  const yearDaysElapsed = getElapsedDaysInYear(targetYear);
  const yearAvgDaily =
    yearDaysElapsed > 0
      ? (yearBreakdown?.totalSpending ?? 0) / yearDaysElapsed
      : 0;

  const ownershipDays = getDaysSinceOwnership(bikeData?.data?.purchaseDate);
  const lifetimeAvgDaily =
    ownershipDays > 0 ? (lifetimeBreakdown?.totalSpending ?? 0) / ownershipDays : 0;

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

        {period === "trend" && (
          <PeriodStepper
            label={<span className="text-sm">{trendYear}</span>}
            onPrev={() => setTrendYear((y) => (Number(y) - 1)?.toString())}
            onNext={() => setTrendYear((y) => (Number(y) + 1)?.toString())}
            disableNext={Number(trendYear) >= now?.getFullYear()}
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
          {period === "trend" && (
            <SpendingTrendChart bikeId={bikeId} targetYear={trendYear} />
          )}

          {period === "month" && (
            <MonthlySpendingBreakdown
              key={targetMonth}
              periodLabel={getPeriodLabel(period, targetMonth, targetYear)}
              totalSpending={monthBreakdown?.totalSpending ?? 0}
              categories={monthBreakdown?.categories ?? []}
              isLoading={monthQuery?.isLoading}
              isError={monthQuery?.isError}
              errorMessage={monthQuery?.error?.message}
              onRetry={() => monthQuery?.refetch()}
              {...(monthDaysElapsed > 0
                ? {
                    avgDailyExpense: monthAvgDaily,
                    daysElapsed: monthDaysElapsed,
                  }
                : {})}
            />
          )}

          {period === "year" && (
            <PeriodSpendingBreakdown
              key={`year-${targetYear}`}
              periodLabel={getPeriodLabel(period, targetMonth, targetYear)}
              totalSpending={yearBreakdown?.totalSpending ?? 0}
              categories={yearBreakdown?.categories ?? []}
              isLoading={yearQuery?.isLoading}
              isError={yearQuery?.isError}
              errorMessage={yearQuery?.error?.message}
              onRetry={() => yearQuery?.refetch()}
              avgDailyScopeLabel="this year"
              {...(yearDaysElapsed > 0
                ? { avgDailyExpense: yearAvgDaily, daysElapsed: yearDaysElapsed }
                : {})}
            />
          )}

          {period === "lifetime" && (
            <PeriodSpendingBreakdown
              key="lifetime"
              periodLabel={getPeriodLabel(period, targetMonth, targetYear)}
              totalSpending={lifetimeBreakdown?.totalSpending ?? 0}
              categories={lifetimeBreakdown?.categories ?? []}
              isLoading={lifetimeQuery?.isLoading}
              isError={lifetimeQuery?.isError}
              errorMessage={lifetimeQuery?.error?.message}
              onRetry={() => lifetimeQuery?.refetch()}
              avgDailyScopeLabel="of ownership"
              {...(ownershipDays > 0
                ? { avgDailyExpense: lifetimeAvgDaily, daysElapsed: ownershipDays }
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
