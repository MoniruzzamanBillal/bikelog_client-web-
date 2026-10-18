"use client";

import StateCard from "@/components/shared/StateCard/StateCard";
import StatusTag from "@/components/shared/StatusTag/StatusTag";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Droplet } from "lucide-react";
import { ReactNode } from "react";
import { TEngineOilStatus } from "./type/engine-oil-log.types";

const km = (n: number) => n?.toLocaleString();
const fmtDate = (d: string) => format(new Date(d), "d MMM");

const tagFor = (status: TEngineOilStatus["status"]) => {
  if (status === "overdue") return { tone: "danger" as const, label: "Overdue" };
  if (status === "upcoming")
    return { tone: "warning" as const, label: "Due soon" };
  if (status === "ok") return { tone: "success" as const, label: "On track" };
  return null;
};

type TProps = {
  status?: TEngineOilStatus;
  isLoading?: boolean;
  addButton: ReactNode;
};

/**
 * The reason to open this screen: how far the current oil has run and when the next change
 * is due. Every figure comes from `GET /engine-oil-logs/status` already computed —
 * ! nothing here derives a date or a km/day of its own. The server computes those, and two
 * ! sources of truth for one number disagree on the same screen invisibly (§0 H-W3).
 *
 * Four states, none of them an error, and three of them have no date (§0 H-W8).
 */
export default function EngineOilStatusCard({
  status,
  isLoading,
  addButton,
}: TProps) {
  if (isLoading) {
    return <Skeleton className="h-[164px] rounded-[10px]" />;
  }

  const last = status?.lastChange;

  // ── state 1: no oil change logged yet ──
  if (!status || !last) {
    return (
      <StateCard
        icon={Droplet}
        title="No oil change logged yet"
        message="Log your last change and Bike Log works out how far you've run on it and when the next one is due."
        action={addButton}
      />
    );
  }

  const tag = tagFor(status?.status);
  const hasInterval = last?.intervalKm != null;
  const isOverdue = status?.status === "overdue";
  // ! kmRemaining arrives SIGNED (H-W7) — print the overshoot straight off it, never
  // ! recomputed from currentOdometer the way RemindersBanner has to.
  const remaining = status?.kmRemaining;
  const projectedDate = status?.projectedDueDate;

  // ── headline ──
  const headline = !hasInterval
    ? `${km(status?.kmSinceChange ?? 0)} km on this oil`
    : isOverdue
      ? `Due ${km(Math.abs(remaining ?? 0))} km ago`
      : projectedDate
        ? `Next change around ${format(new Date(projectedDate), "d MMM")}`
        : `~${km(remaining ?? 0)} km to go`;

  // ── the line under it ──
  const subline = !hasInterval
    ? "Set an interval on this change to get a due date"
    : isOverdue
      ? last?.nextDueOdometer != null
        ? `Was due at ${km(last?.nextDueOdometer)} km`
        : undefined
      : projectedDate
        ? `~${km(remaining ?? 0)} km to go`
        : undefined;

  // ── the audit lines: what makes the headline checkable (§B) ──
  const sinceLine = [
    `${km(status?.kmSinceChange ?? 0)} km on this oil since ${fmtDate(last?.changeDate)}`,
    last?.oilType?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  const detailLine = [
    hasInterval ? `Interval ${km(last?.intervalKm as number)} km` : null,
    status?.percentUsed != null ? `${status?.percentUsed}% used` : null,
    status?.kmPerDay != null ? `at ${status?.kmPerDay} km/day` : null,
    status?.projectedDaysRemaining != null
      ? `${status?.projectedDaysRemaining} days`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // the bar is capped at 100% so an overdue oil fills it rather than overflowing the panel
  const barPercent =
    status?.percentUsed != null
      ? Math.max(0, Math.min(100, status?.percentUsed))
      : null;

  return (
    <div className="panel flex flex-col gap-3 p-4 lg:p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={cn(
              "text-[21px] leading-tight font-medium tracking-[-0.02em] tabular-nums lg:text-[24px]",
              isOverdue && "text-destructive",
            )}
          >
            {headline}
          </div>
          {subline && (
            <div className="mt-1 text-[13px] text-muted-foreground tabular-nums">
              {subline}
            </div>
          )}
        </div>
        {tag && (
          <StatusTag tone={tag?.tone} className="mt-1">
            {tag?.label}
          </StatusTag>
        )}
      </div>

      {barPercent != null && (
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
          role="presentation"
        >
          <div
            className={cn(
              "h-full rounded-full",
              isOverdue ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${barPercent}%` }}
          />
        </div>
      )}

      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground tabular-nums">
        <span>{sinceLine}</span>
        {detailLine && <span>{detailLine}</span>}
        <span>Odometer now {km(status?.currentOdometer)} km</span>
      </div>
    </div>
  );
}
