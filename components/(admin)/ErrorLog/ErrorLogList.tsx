"use client";

import StateCard from "@/components/shared/StateCard/StateCard";
import StatusTag from "@/components/shared/StatusTag/StatusTag";
import { TablePagination } from "@/components/shared/table/TablePagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetchData } from "@/hooks/useApi";
import { buildUrl } from "@/utils/buildUrl";
import { format } from "date-fns";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import ErrorLogCard from "./ErrorLogCard";
import ErrorLogDetailModal from "./ErrorLogDetailModal";
import { getStatusTone } from "./errorLogStatus";
import { TErrorLog, TErrorLogMethodFilter } from "./type/error-log.types";

const METHOD_FILTERS: TErrorLogMethodFilter[] = [
  "all",
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
];

const th =
  "h-10 px-2 text-left text-[11px] font-normal tracking-[0.08em] whitespace-nowrap text-muted-foreground uppercase";

export default function ErrorLogList() {
  const [page, setPage] = useState(1);
  const [methodFilter, setMethodFilter] = useState<TErrorLogMethodFilter>("all");
  const [selectedLog, setSelectedLog] = useState<TErrorLog | null>(null);
  const limit = 20;

  const { data, isLoading, isError, error } = useFetchData<{
    result: TErrorLog[];
    meta: number;
  }>(
    ["errorLogs", page?.toString(), methodFilter],
    buildUrl("/admin/error-logs", {
      page,
      limit,
      sort: "-createdAt",
      method: methodFilter !== "all" ? methodFilter : undefined,
    }),
  );

  const logs = data?.data?.result ?? [];
  const meta = data?.data?.meta ?? 0;
  const totalPages = Math.ceil(meta / limit);

  return (
    <>
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="panel flex-[1_1_200px] px-4 py-3.5">
          <div className="text-xs text-muted-foreground">
            Errors logged (last 30 days)
            {methodFilter !== "all" && ` · ${methodFilter}`}
          </div>
          <div className="text-[26px] font-medium tabular-nums">
            {isLoading || isError ? "—" : meta}
          </div>
        </div>
        <div className="flex flex-[1_1_200px] items-end justify-end gap-2">
          <Select
            value={methodFilter}
            onValueChange={(value) => {
              setMethodFilter(value as TErrorLogMethodFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent position="popper">
              {METHOD_FILTERS?.map((method) => (
                <SelectItem key={method} value={method}>
                  {method === "all" ? "All methods" : method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        [1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 rounded-[10px]" />
        ))
      ) : isError ? (
        <div className="flex items-center gap-2.5 rounded-[10px] bg-card px-4 py-3.5 text-[13px] shadow-[0_0_0_1px_color-mix(in_srgb,var(--destructive)_40%,transparent)]">
          <AlertTriangle className="size-4 shrink-0 text-destructive" />
          {(error as { message?: string })?.message ??
            "Failed to load error logs"}
        </div>
      ) : logs?.length === 0 ? (
        <StateCard
          icon={ShieldCheck}
          title="No errors logged"
          message="Entries expire automatically after 30 days."
          className="max-w-none [&>span]:text-success [&>span]:shadow-[0_0_0_1px_color-mix(in_srgb,var(--success)_45%,transparent)]"
        />
      ) : (
        <>
          {/* ── desktop table ── */}
          <div className="panel hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="row-fade">
                    <th className={`${th} pl-4`}>Status</th>
                    <th className={th}>Request</th>
                    <th className={th}>Message</th>
                    <th className={th}>User</th>
                    <th className={`${th} pr-4 text-right`}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs?.map((log) => (
                    <tr
                      key={log?._id}
                      onClick={() => setSelectedLog(log)}
                      className="row-fade h-12 cursor-pointer"
                    >
                      <td className="pl-4">
                        <StatusTag tone={getStatusTone(log?.status)}>
                          {log?.status}
                        </StatusTag>
                      </td>
                      <td className="max-w-[280px] px-2">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <span className="text-[11.5px] font-semibold">
                            {log?.method}
                          </span>
                          <span className="truncate font-mono text-xs text-muted-foreground">
                            {log?.path}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-[320px] truncate px-2">
                        {log?.message}
                      </td>
                      <td className="px-2 whitespace-nowrap text-muted-foreground">
                        {log?.userEmail ?? "Anonymous"}
                      </td>
                      <td className="pr-4 text-right whitespace-nowrap text-muted-foreground tabular-nums">
                        {format(new Date(log?.createdAt), "dd MMM, hh:mm a")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={meta}
                itemsPerPage={limit}
                onPageChange={setPage}
              />
            )}
          </div>

          {/* ── mobile cards ── */}
          <div className="flex flex-col gap-2.5 lg:hidden">
            {logs?.map((log) => (
              <ErrorLogCard key={log?._id} log={log} onSelect={setSelectedLog} />
            ))}
            {totalPages > 1 && (
              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={meta}
                itemsPerPage={limit}
                onPageChange={setPage}
                className="panel border-t-0"
              />
            )}
          </div>
        </>
      )}

      {selectedLog && (
        <ErrorLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </>
  );
}
