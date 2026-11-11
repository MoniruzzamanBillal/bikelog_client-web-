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

// ! one date parser, with a NaN guard (spec 37 H-C). `projectedDueDate` is a genuine
// ! instant, so `new Date()` — never a UTC-midnight date-only parser. A bad/absent value
// ! returns null so the caller degrades to the dateless branch instead of "Invalid Date".
const fmtDate = (d?: string | null): string | null => {
  if (!d) return null;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : format(dt, "d MMM");
};

const tagFor = (status: "ok" | "upcoming" | "overdue" | "unknown") => {
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
 * Spec 37: show a projected date in every state the server can date — overdue ("Was due
 * around 3 Oct") and a provisional ESTIMATE for a change with no interval of its own,
 * derived server-side from the oil type's suggested interval. All new fields are optional,
 * so against a pre-spec-56 server this renders byte-for-byte its spec-33 self (H-A).
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

  const hasInterval = last?.intervalKm != null;
  const est = status?.estimate;
  // ! when the change has no interval of its own but an oil type resolves, the server's
  // ! provisional estimate drives the WHOLE card — headline, sub-line, bar and pill tone
  // ! (spec 37 D1/D3). Never a real-interval bar beside an estimated date.
  const drivenByEstimate = !hasInterval && est != null;

  // ── pill ──
  const tag = drivenByEstimate
    ? (() => {
        const t = tagFor(est!.status)!;
        return { tone: t.tone, label: `${t.label} · est.` };
      })()
    : tagFor(status?.status);

  // ── headline / sub-line ──
  // ! kmRemaining arrives SIGNED (H-W7) — print the overshoot straight off it, never
  // ! recomputed from currentOdometer the way RemindersBanner has to.
  let headline: string;
  let subline: string | undefined;
  let isDanger = false;

  if (drivenByEstimate) {
    const estDate = fmtDate(est!.projectedDueDate);
    const estOverdue = est!.status === "overdue";
    isDanger = estOverdue;
    if (estDate) {
      headline = estOverdue
        ? `Was due around ${estDate}`
        : `Next change around ${estDate}`;
    } else {
      headline = estOverdue
        ? `Due ${km(Math.abs(est!.kmRemaining))} km ago`
        : `~${km(est!.kmRemaining)} km to go`;
    }
    subline = estOverdue
      ? [
          est!.overdueDays != null ? `${est!.overdueDays} days past due` : null,
          `~${km(Math.abs(est!.kmRemaining))} km past due`,
        ]
          .filter(Boolean)
          .join(" · ")
      : `~${km(est!.kmRemaining)} km to go`;
  } else if (!hasInterval) {
    // ── no interval and no oil type to estimate from ──
    headline = `${km(status?.kmSinceChange ?? 0)} km on this oil`;
    subline = "Set an interval on this change to get a due date";
  } else {
    const isOverdue = status?.status === "overdue";
    const remaining = status?.kmRemaining ?? 0;
    const projectedDate = fmtDate(status?.projectedDueDate);
    isDanger = isOverdue;
    if (isOverdue) {
      if (projectedDate) {
        headline = `Was due around ${projectedDate}`;
        subline = [
          status?.overdueDays != null
            ? `${status?.overdueDays} days past due`
            : null,
          `~${km(Math.abs(remaining))} km past due`,
        ]
          .filter(Boolean)
          .join(" · ");
      } else {
        headline = `Due ${km(Math.abs(remaining))} km ago`;
        subline =
          last?.nextDueOdometer != null
            ? `Was due at ${km(last?.nextDueOdometer)} km`
            : undefined;
      }
    } else if (projectedDate) {
      headline = `Next change around ${projectedDate}`;
      subline = `~${km(remaining)} km to go`;
    } else {
      headline = `~${km(remaining)} km to go`;
      subline = undefined;
    }
  }

  // ── the audit lines: what makes the headline checkable (§B) ──
  const changeDate = fmtDate(last?.changeDate);
  const sinceLine = [
    `${km(status?.kmSinceChange ?? 0)} km on this oil${changeDate ? ` since ${changeDate}` : ""}`,
    last?.oilType?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  // ! rate-basis suffix (spec 37 D5): longRun/lifetime get a tag, "recent" (and absent)
  // ! get none so the common case reads exactly as today.
  const rateSuffix =
    status?.rateBasis?.source === "longRun"
      ? " long-run avg"
      : status?.rateBasis?.source === "lifetime"
        ? " lifetime avg"
        : "";

  // the estimate's own audit line, explicitly marked `est.` so it never mixes with the
  // real figures below it (spec 37 D2)
  const estimateAuditLine = drivenByEstimate
    ? `${km(status?.kmSinceChange ?? 0)} / ${km(est!.intervalKm)} km on this oil · ${est!.percentUsed}% · est.`
    : null;

  const detailLine = drivenByEstimate
    ? null
    : [
        hasInterval ? `Interval ${km(last?.intervalKm as number)} km` : null,
        status?.percentUsed != null ? `${status?.percentUsed}% used` : null,
        status?.kmPerDay != null
          ? `at ${status?.kmPerDay} km/day${rateSuffix}`
          : null,
        status?.projectedDaysRemaining != null
          ? `${status?.projectedDaysRemaining} days`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

  // the source sentence names the oil type and how to make the estimate exact (spec 37 D4)
  const sourceSentence = drivenByEstimate
    ? `Estimated from ${last?.oilType?.name ?? "this oil type"}'s ${km(est!.intervalKm)} km interval — set one on this change to make it exact.`
    : null;

  // the bar is capped at 100% so an overdue oil fills it rather than overflowing the panel.
  // ! when the estimate drives, the bar fills from IT — not a real interval (D1).
  const rawPercent = drivenByEstimate ? est!.percentUsed : status?.percentUsed;
  const barPercent =
    rawPercent != null ? Math.max(0, Math.min(100, rawPercent)) : null;

  return (
    <div className="panel flex flex-col gap-3 p-4 lg:p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={cn(
              "text-[21px] leading-tight font-medium tracking-[-0.02em] tabular-nums lg:text-[24px]",
              isDanger && "text-destructive",
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
              isDanger ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${barPercent}%` }}
          />
        </div>
      )}

      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground tabular-nums">
        <span>{sinceLine}</span>
        {estimateAuditLine && <span>{estimateAuditLine}</span>}
        {detailLine && <span>{detailLine}</span>}
        <span>Odometer now {km(status?.currentOdometer)} km</span>
        {sourceSentence && <span>{sourceSentence}</span>}
      </div>
    </div>
  );
}
