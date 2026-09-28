"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
  showItemCount?: boolean;
  siblingCount?: number;
}

const pageBtn =
  "grid size-8 place-items-center rounded-lg text-[13px] tabular-nums shadow-sm transition-colors hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-45";

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className,
  showItemCount = true,
  siblingCount = 1,
}: TablePaginationProps) {
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to display
  const generatePagination = () => {
    const delta = siblingCount;
    const range = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range?.push(i);
      }
    }

    range?.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots?.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots?.push("...");
        }
      }
      rangeWithDots?.push(i);
      l = i;
    });

    return rangeWithDots;
  };

  const paginationRange = generatePagination();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px] sm:px-[18px]",
        className,
      )}
    >
      {showItemCount && (
        <span className="text-muted-foreground tabular-nums">
          Showing {totalItems > 0 ? startIndex : 0} to {endIndex} of{" "}
          {totalItems} items
        </span>
      )}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={cn(pageBtn, "text-muted-foreground")}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>

        {paginationRange?.map((page, index) => {
          if (page === "...") {
            return (
              <span
                key={`dots-${index}`}
                className="grid size-8 place-items-center text-muted-foreground"
              >
                …
              </span>
            );
          }

          const pageNumber = page as number;
          const active = currentPage === pageNumber;
          return (
            <button
              type="button"
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              className={cn(pageBtn, active && "text-primary shadow-glow")}
              aria-label={`Go to page ${pageNumber}`}
              aria-current={active ? "page" : undefined}
            >
              {pageNumber}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={pageBtn}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
