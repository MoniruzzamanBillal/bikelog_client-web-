import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type TStatTileProps = {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const valueSize = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-[30px]",
};

/** Label / big tabular value / sub-line tile (Nocturne design). */
export default function StatTile({
  label,
  value,
  unit,
  sub,
  size = "md",
  className,
}: TStatTileProps) {
  return (
    <div className={cn("panel flex min-w-0 flex-col gap-0.5 p-4", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "truncate font-medium tracking-[-0.02em] tabular-nums",
          valueSize[size],
        )}
      >
        {value}
        {unit && (
          <span className="ml-1 text-[13px] font-normal tracking-normal text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <div className="truncate text-xs text-muted-foreground tabular-nums">
          {sub}
        </div>
      )}
    </div>
  );
}
