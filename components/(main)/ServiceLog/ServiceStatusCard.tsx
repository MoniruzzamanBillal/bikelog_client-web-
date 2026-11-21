"use client";

import StatusTag from "@/components/shared/StatusTag/StatusTag";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { differenceInCalendarDays, format, parse } from "date-fns";
import { TServiceStatus } from "./type/service-log.types";

// ! date-only (H-W-SVC-6): parse the calendar portion, never `new Date(iso)` which shifts a
// ! day in Dhaka between 00:00–06:00.
const fmtDate = (s?: string | null): string => {
  if (!s) return "";
  const d = parse(s.slice(0, 10), "yyyy-MM-dd", new Date());
  return Number.isNaN(d.getTime()) ? "" : format(d, "d MMM");
};

// date-only day count — allowed (a count off a date the server already decided; the warranty
// FIGURES are never re-derived here, H-W-SVC-2).
const daysUntil = (s: string): number =>
  differenceInCalendarDays(parse(s.slice(0, 10), "yyyy-MM-dd", new Date()), new Date());

const whenLine = (days: number): string =>
  days <= 0 ? "due now" : days === 1 ? "tomorrow" : `in ${days} days`;

type TProps = {
  status?: TServiceStatus;
  isLoading?: boolean;
};

function Bar({ completed, danger }: { completed: number; danger?: boolean }) {
  const pct = Math.max(0, Math.min(100, (completed / 5) * 100));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
      role="presentation"
    >
      <div
        className={cn("h-full rounded-full", danger ? "bg-destructive" : "bg-primary")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Shell({
  tag,
  tone,
  headline,
  sub,
  footer,
  footerDanger,
  bar,
  danger,
}: {
  tag: string;
  tone: "success" | "danger" | "neutral";
  headline: string;
  sub?: string;
  footer?: string;
  footerDanger?: boolean;
  bar?: number;
  danger?: boolean;
}) {
  return (
    <div className="panel flex flex-col gap-3 p-4 lg:p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
            Warranty service
          </div>
          <div
            className={cn(
              "mt-1.5 text-[18px] leading-tight font-medium tracking-[-0.01em] tabular-nums lg:text-[20px]",
              danger && "text-destructive",
            )}
          >
            {headline}
          </div>
          {sub && (
            <div className="mt-1 text-[13px] text-muted-foreground tabular-nums">
              {sub}
            </div>
          )}
        </div>
        <StatusTag tone={tone === "danger" ? "danger" : tone === "success" ? "success" : "neutral"} className="mt-1">
          {tag}
        </StatusTag>
      </div>
      {bar != null && <Bar completed={bar} danger={danger} />}
      {footer && (
        <div
          className={cn(
            "text-xs tabular-nums",
            footerDanger ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

/**
 * The warranty progress card (spec 44 §B) — this screen's alert surface, a port of the app's
 * already-live `ServiceStatusCard`. Every number comes from `/service-logs/status` (H-W-SVC-2).
 * Returns null when there are no services at all — the list's own StateCard carries that.
 */
export default function ServiceStatusCard({ status, isLoading }: TProps) {
  if (isLoading) return <Skeleton className="h-[128px] rounded-[10px]" />;
  if (!status) return null;

  const {
    warrantyCompleted,
    warrantyLogged,
    warrantyVoidRisk,
    nextWarranty,
    nextService,
  } = status;

  // state 1 — no services at all → no card
  if (warrantyLogged === 0 && nextWarranty == null && nextService == null) {
    return null;
  }

  const left = 5 - warrantyCompleted;
  const leftLabel = left === 1 ? "1 service" : `${left} services`;

  // state 3 — void risk (the one money-bearing alert)
  if (warrantyVoidRisk && nextWarranty != null) {
    const daysPast = Math.abs(daysUntil(nextWarranty.dueDate));
    return (
      <Shell
        tone="danger"
        danger
        tag="Overdue"
        headline={`Warranty service #${nextWarranty.number ?? warrantyCompleted + 1} is overdue`}
        sub={`${daysPast === 1 ? "1 day" : `${daysPast} days`} past the due date (~${fmtDate(nextWarranty.dueDate)})`}
        bar={warrantyCompleted}
        footer="Book it now — missing a service voids the warranty."
        footerDanger
      />
    );
  }

  // state 4 — all 5 warranty services done
  if (warrantyCompleted >= 5) {
    return (
      <Shell
        tone="success"
        tag="Warranty complete"
        headline={
          nextService != null
            ? `Next service ~ ${fmtDate(nextService.dueDate)}`
            : "All 5 warranty services done"
        }
        sub={nextService != null ? whenLine(daysUntil(nextService.dueDate)) : undefined}
      />
    );
  }

  // state 2 (and state 5's warranty-present case) — in progress
  if (nextWarranty != null) {
    return (
      <Shell
        tone="success"
        tag={`${warrantyCompleted} of 5`}
        headline={`Next service #${nextWarranty.number ?? warrantyCompleted + 1} ~ ${fmtDate(nextWarranty.dueDate)}`}
        sub={`${whenLine(daysUntil(nextWarranty.dueDate))}${nextWarranty.status === "overdue" ? " · overdue" : ""}`}
        bar={warrantyCompleted}
        footer={`${leftLabel} left to keep the warranty`}
      />
    );
  }

  // state 5 — regular-only resting
  if (nextService != null) {
    return (
      <Shell
        tone="neutral"
        tag="Scheduled"
        headline={`Next service ~ ${fmtDate(nextService.dueDate)}`}
        sub={`${whenLine(daysUntil(nextService.dueDate))}${nextService.status === "overdue" ? " · overdue" : ""}`}
      />
    );
  }

  // warranty rows logged but nothing upcoming
  return (
    <Shell
      tone="success"
      tag={`${warrantyCompleted} of 5`}
      headline="Schedule your next warranty service"
      bar={warrantyCompleted}
      footer={`${leftLabel} left to keep the warranty`}
    />
  );
}
