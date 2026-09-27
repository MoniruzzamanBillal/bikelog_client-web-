"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TablePagination } from "@/components/shared/table/TablePagination";
import { useFetchData } from "@/hooks/useApi";
import { buildUrl } from "@/utils/buildUrl";
import { useState } from "react";
import ErrorLogCard from "./ErrorLogCard";
import ErrorLogDetailModal from "./ErrorLogDetailModal";
import { TErrorLog, TErrorLogMethodFilter } from "./type/error-log.types";

const METHOD_FILTERS: TErrorLogMethodFilter[] = [
  "all",
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
];

export default function ErrorLogList() {
  const [page, setPage] = useState(1);
  const [methodFilter, setMethodFilter] = useState<TErrorLogMethodFilter>("all");
  const [selectedLog, setSelectedLog] = useState<TErrorLog | null>(null);
  const limit = 20;

  const { data, isLoading, isError, error } = useFetchData<{
    result: TErrorLog[];
    meta: number;
  }>(
    ["errorLogs", page.toString(), methodFilter],
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
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">
          Errors logged (last 30 days)
          {methodFilter !== "all" && ` · ${methodFilter}`}
        </p>
        <p className="mt-1 text-2xl font-semibold">
          {isLoading ? "—" : meta}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Error Logs</h2>
        <Select
          value={methodFilter}
          onValueChange={(value) => {
            setMethodFilter(value as TErrorLogMethodFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent position="popper">
            {METHOD_FILTERS.map((method) => (
              <SelectItem key={method} value={method}>
                {method === "all" ? "All methods" : method}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : isError ? (
        <p className="text-sm text-red-600">
          {(error as { message?: string })?.message ??
            "Failed to load error logs"}
        </p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No errors logged.</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <ErrorLogCard key={log._id} log={log} onSelect={setSelectedLog} />
          ))}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={meta}
          itemsPerPage={limit}
          onPageChange={setPage}
          className="rounded-lg border border-border bg-card"
        />
      )}

      {selectedLog && (
        <ErrorLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
