"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getStatusBadgeClass } from "./errorLogStatus";
import { TErrorLog } from "./type/error-log.types";

type TProps = {
  log: TErrorLog;
  onSelect: (log: TErrorLog) => void;
};

export default function ErrorLogCard({ log, onSelect }: TProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(log)}
      className="w-full rounded-lg border border-border bg-card p-4 text-left hover:bg-muted/50"
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            getStatusBadgeClass(log.status),
          )}
        >
          {log.status}
        </span>
        <span className="text-xs font-semibold">{log.method}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
          {log.path}
        </span>
      </div>

      <p className="mt-2 line-clamp-2 text-sm">{log.message}</p>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{log.userEmail ?? "Anonymous"}</span>
        <span className="shrink-0">
          {format(new Date(log.createdAt), "dd-MMM-yyyy, hh:mm a")}
        </span>
      </div>
    </button>
  );
}
