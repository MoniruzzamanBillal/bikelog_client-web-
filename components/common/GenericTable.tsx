"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

interface GenericTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  filterKey?: keyof TData;
  isLoading?: boolean;
}

export default function GenericTable<TData>({
  data,
  columns,
  filterKey,
  isLoading = false,
}: GenericTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageNumbers = () => {
    const pageCount = table.getPageCount();
    const currentPage = table.getState().pagination.pageIndex;

    if (pageCount <= 5) {
      return Array.from({ length: pageCount }, (_, i) => i);
    }

    let start = Math.max(0, currentPage - 2);
    let end = Math.min(pageCount - 1, currentPage + 2);

    if (currentPage <= 2) {
      end = 4;
    } else if (currentPage >= pageCount - 3) {
      start = pageCount - 5;
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      {filterKey && (
        <Input
          placeholder={`Filter ${String(filterKey)}...`}
          value={
            (table
              .getColumn(filterKey as string)
              ?.getFilterValue() as string) ?? ""
          }
          onChange={(e) =>
            table.getColumn(filterKey as string)?.setFilterValue(e.target.value)
          }
          className="max-w-sm border border-blue-300  "
        />
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table?.getHeaderGroups()?.map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header?.column.columnDef.header,
                          header?.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: 6 }).map((_, rowIndex) => (
                <TableRow key={`skeleton-row-${rowIndex}`}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={`skeleton-cell-${rowIndex}-${colIndex}`}>
                      <div className="space-y-2 py-2 ">
                        <Skeleton className="h-5 bg-slate-300  " />
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row?.getVisibleCells()?.map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}

      {!isLoading && data.length > 0 && (
        <div className="flex items-center justify-between px-2">
          {/* Selected rows info */}
          <div className="text-muted-foreground flex-1 text-sm">
            {table.getFilteredSelectedRowModel().rows.length > 0 ? (
              <>
                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} row(s) selected.
              </>
            ) : (
              <>
                Showing{" "}
                {table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1}{" "}
                to{" "}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length,
                )}{" "}
                of {table.getFilteredRowModel().rows.length} results
              </>
            )}
          </div>

          <div className="flex items-center space-x-6 lg:space-x-8">
            {/* Page info */}
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Page</p>
              <span className="text-sm font-medium">
                {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </span>
            </div>

            {/* Page navigation buttons */}
            <div className="flex items-center space-x-2">
              {/* Previous page */}
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page Numbers */}
              {pageNumbers().map((pageIndex) => (
                <Button
                  key={pageIndex}
                  variant={
                    pageIndex === table.getState().pagination.pageIndex
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => table.setPageIndex(pageIndex)}
                  className="h-8 w-8"
                >
                  {pageIndex + 1}
                </Button>
              ))}

              {/* Ellipsis for many pages */}
              {table.getPageCount() > 5 &&
                table.getState().pagination.pageIndex <
                  table.getPageCount() - 3 && (
                  <span className="px-1 text-sm">...</span>
                )}

              {/* Last page if not shown */}
              {table.getPageCount() > 5 &&
                !pageNumbers().includes(table.getPageCount() - 1) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    className="h-8 w-8"
                  >
                    {table.getPageCount()}
                  </Button>
                )}

              {/* Next page */}
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/*  */}
    </div>
  );
}
