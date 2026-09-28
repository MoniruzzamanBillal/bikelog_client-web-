"use client";

import { cn } from "@/lib/utils";

type TSegmentedTabsProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  // stretch the segments to the full width (mobile)
  fill?: boolean;
};

/** Nocturne `.seg` control: hairline-bordered segments, accent-outlined active one. */
export default function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  className,
  fill = false,
}: TSegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex max-w-full overflow-x-auto rounded-lg border border-border",
        fill && "flex w-full",
        className,
      )}
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "shrink-0 px-3 py-[7px] text-[13px] whitespace-nowrap transition-colors",
              fill && "flex-1",
              i > 0 && "border-l border-border",
              active
                ? "text-primary shadow-[inset_0_0_0_1px_var(--primary)]"
                : "text-foreground/85 hover:bg-foreground/7",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
