import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export type TStatusTone = "neutral" | "accent" | "success" | "warning" | "danger";

const toneClass: Record<TStatusTone, string> = {
  neutral: "bg-secondary text-foreground/85",
  accent: "bg-accent text-accent-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
};

/** Small status pill: overdue / upcoming / full / partial / open / resolved… */
export default function StatusTag({
  tone = "neutral",
  children,
  className,
}: {
  tone?: TStatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] leading-[1.45] tracking-[0.02em] whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
