"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { flexRender, Table as TanStackTable } from "@tanstack/react-table";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { ReactNode } from "react";
import { TablePagination } from "./TablePagination";

// ! columns may set `meta: { align: "right" }` for numeric columns
type TColumnMeta = { align?: "left" | "right" | "center" };

const alignClass = (meta: unknown) => {
  const align = (meta as TColumnMeta | undefined)?.align;
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
};

type TableContentProps<TData> = {
  table: TanStackTable<TData>;
  showSerialNumber?: boolean;
  isLoading?: boolean;
  emptyState?: ReactNode;

  // !
  totalItems: number;
  totalPages?: number;
  currentPage?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
};

const skeletonWidths = ["72%", "58%", "66%", "48%", "70%", "54%"];

export default function TableContent<TData>({
  table,
  showSerialNumber = true,
  isLoading = false,
  emptyState,
  // !
  totalItems,
  totalPages,
  onPageChange,
  currentPage,
  itemsPerPage,
}: TableContentProps<TData>) {
  const rows = table?.getRowModel()?.rows;
  const isEmpty = !isLoading && rows?.length === 0;

  return (
    <div className="overflow-hidden rounded-[10px] bg-card shadow-sm">
      {!(isEmpty && emptyState) && (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-max text-[13px] tabular-nums">
            <thead>
              {table?.getHeaderGroups()?.map((headerGroup) => (
                <tr key={headerGroup?.id} className="row-fade">
                  {showSerialNumber && (
                    <th className="h-10 w-9 pr-2 pl-[18px] text-left text-[11px] font-normal tracking-[0.08em] text-muted-foreground uppercase">
                      #
                    </th>
                  )}

                  {headerGroup?.headers?.map((header) => (
                    <th
                      key={header?.id}
                      className={cn(
                        "h-10 px-2 text-[11px] font-normal tracking-[0.08em] whitespace-nowrap text-muted-foreground uppercase first:pl-[18px] last:pr-3",
                        alignClass(header?.column?.columnDef?.meta),
                      )}
                    >
                      <div
                        onClick={
                          header?.column?.getCanSort()
                            ? header?.column?.getToggleSortingHandler()
                            : undefined
                        }
                        className={cn(
                          "inline-flex items-center gap-1",
                          header?.column?.getCanSort() &&
                            "cursor-pointer select-none hover:text-foreground",
                        )}
                      >
                        {flexRender(
                          header?.column?.columnDef?.header,
                          header?.getContext(),
                        )}

                        {header?.column?.getCanSort() &&
                          ({
                            asc: <ChevronUp className="size-3.5" />,
                            desc: <ChevronDown className="size-3.5" />,
                          }[header?.column?.getIsSorted() as string] ?? (
                            <ChevronsUpDown className="size-3.5" />
                          ))}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {isLoading &&
                skeletonWidths?.map((width, i) => (
                  <tr key={i} className="row-fade h-12">
                    <td colSpan={100} className="pl-[18px]">
                      <Skeleton className="h-3" style={{ width }} />
                    </td>
                  </tr>
                ))}

              {isEmpty && (
                <tr>
                  <td
                    colSpan={100}
                    className="px-[18px] py-10 text-center text-sm text-muted-foreground"
                  >
                    No data available
                  </td>
                </tr>
              )}

              {!isLoading &&
                rows?.map((row, index: number) => (
                  <tr key={row?.id} className="row-fade h-12">
                    {showSerialNumber && (
                      <td className="pr-2 pl-[18px] text-muted-foreground">
                        {(currentPage ?? 0) * (itemsPerPage ?? 10) + index + 1}
                      </td>
                    )}

                    {row?.getVisibleCells()?.map((cell) => (
                      <td
                        key={cell?.id}
                        className={cn(
                          "px-2 whitespace-nowrap first:pl-[18px] last:pr-3",
                          alignClass(cell?.column?.columnDef?.meta),
                        )}
                      >
                        {flexRender(
                          cell?.column?.columnDef?.cell,
                          cell?.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {isEmpty && emptyState}

      {totalItems > (itemsPerPage ?? 10) && (
        <TablePagination
          currentPage={(currentPage ?? 0) + 1}
          itemsPerPage={itemsPerPage ?? 10}
          totalPages={totalPages || 1}
          totalItems={totalItems || 0}
          onPageChange={(page) => onPageChange(page - 1)}
        />
      )}
    </div>
  );
}
