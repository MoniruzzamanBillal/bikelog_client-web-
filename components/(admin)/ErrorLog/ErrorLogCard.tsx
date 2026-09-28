"use client";

import StatusTag from "@/components/shared/StatusTag/StatusTag";
import { format } from "date-fns";
import { getStatusTone } from "./errorLogStatus";
import { TErrorLog } from "./type/error-log.types";

type TProps = {
  log: TErrorLog;
  onSelect: (log: TErrorLog) => void;
};

/** Mobile card row for the error log list (desktop uses a table). */
export default function ErrorLogCard({ log, onSelect }: TProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(log)}
      className="panel flex w-full flex-col gap-1.5 px-3.5 py-3 text-left transition-shadow hover:shadow-md"
    >
      <div className="flex min-w-0 items-center gap-2">
        <StatusTag tone={getStatusTone(log?.status)}>{log?.status}</StatusTag>
        <span className="text-[11.5px] font-semibold">{log?.method}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted-foreground">
          {log?.path}
        </span>
      </div>

      <p className="m-0 line-clamp-2 text-[13px] text-pretty">{log?.message}</p>

      <div className="flex items-center justify-between gap-2 text-[11.5px] text-muted-foreground">
        <span className="truncate">{log?.userEmail ?? "Anonymous"}</span>
        <span className="shrink-0 tabular-nums">
          {format(new Date(log?.createdAt), "dd MMM, hh:mm a")}
        </span>
      </div>
    </button>
  );
}
