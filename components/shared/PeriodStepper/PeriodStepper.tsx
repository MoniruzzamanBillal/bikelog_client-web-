"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReactNode } from "react";

type TPeriodStepperProps = {
  label: ReactNode;
  onPrev: () => void;
  onNext: () => void;
  disableNext?: boolean;
  // label rendered as an input-like box (month picker) vs plain text (year)
  boxed?: boolean;
  className?: string;
};

const stepBtn =
  "grid size-10 shrink-0 place-items-center rounded-lg shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-45";

/** ‹ period › control used by the mileage + spending screens. */
export default function PeriodStepper({
  label,
  onPrev,
  onNext,
  disableNext = false,
  boxed = false,
  className,
}: TPeriodStepperProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={onPrev}
        className={stepBtn}
        aria-label="Previous period"
      >
        <ChevronLeft className="size-4" />
      </button>
      <div
        className={cn(
          "min-w-0 tabular-nums",
          boxed
            ? "flex h-10 max-w-60 flex-1 items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-sm"
            : "px-1 text-[17px] font-medium",
        )}
      >
        {label}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={disableNext}
        className={stepBtn}
        aria-label="Next period"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
