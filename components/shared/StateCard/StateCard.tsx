"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CloudOff, LucideIcon, RefreshCw } from "lucide-react";
import { ReactNode } from "react";

type TStateCardProps = {
  variant?: "empty" | "error";
  icon?: LucideIcon;
  title: string;
  message?: ReactNode;
  action?: ReactNode;
  onRetry?: () => void;
  // inside another card (e.g. under a table header) → no own surface
  bare?: boolean;
  className?: string;
};

/** Empty / error block used by every list screen (Nocturne design). */
export default function StateCard({
  variant = "empty",
  icon,
  title,
  message,
  action,
  onRetry,
  bare = false,
  className,
}: TStateCardProps) {
  const Icon = icon ?? (variant === "error" ? CloudOff : undefined);
  const isError = variant === "error";

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 px-5 py-6 sm:px-6 sm:py-8",
        !bare && "panel max-w-[520px]",
        className,
      )}
    >
      {Icon && (
        <span
          className={cn(
            "grid size-10 place-items-center rounded-[10px]",
            isError
              ? "text-destructive shadow-[0_0_0_1px_color-mix(in_srgb,var(--destructive)_50%,transparent)]"
              : "text-primary shadow-glow",
          )}
        >
          <Icon className="size-5" />
        </span>
      )}
      <div className="mt-1 text-[17px] font-medium">{title}</div>
      {message && (
        <div
          className={cn(
            "max-w-[440px] text-[13px] text-muted-foreground",
            isError && "font-mono",
          )}
        >
          {message}
        </div>
      )}
      {(action || onRetry) && (
        <div className="mt-1 flex gap-2">
          {action}
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw />
              Try again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
