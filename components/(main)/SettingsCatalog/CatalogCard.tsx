"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, X } from "lucide-react";
import { ReactNode } from "react";

type TCatalogCardProps = {
  title: string;
  subtitle: string;
  headers: { label: string; short?: string }[];
  isLoading: boolean;
  isEmpty: boolean;
  emptyText: string;
  addOpen: boolean;
  onToggleAdd: () => void;
  addForm: ReactNode;
  children: ReactNode; // table rows
};

export const catalogInput =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-card px-2.5 text-sm tabular-nums outline-none hover:border-foreground/40 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20";

/** Card + fading-rule table shell shared by the two catalog sections. */
export default function CatalogCard({
  title,
  subtitle,
  headers,
  isLoading,
  isEmpty,
  emptyText,
  addOpen,
  onToggleAdd,
  addForm,
  children,
}: TCatalogCardProps) {
  return (
    <section className="panel flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
        <div className="min-w-0">
          <div className="font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <Button
          variant={addOpen ? "outline" : "default"}
          onClick={onToggleAdd}
          className="shrink-0"
        >
          {addOpen ? <X /> : <Plus />}
          {addOpen ? "Close" : "Add"}
        </Button>
      </div>

      {addOpen && <div className="px-4 pb-3">{addForm}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] tabular-nums">
          <thead>
            <tr className="row-fade">
              <th className="h-9 px-2 pl-4 text-left text-[11px] font-normal tracking-[0.08em] text-muted-foreground uppercase">
                Name
              </th>
              {headers.map((h) => (
                <th
                  key={h.label}
                  className="h-9 px-2 text-right text-[11px] font-normal tracking-[0.08em] whitespace-nowrap text-muted-foreground uppercase"
                >
                  <span className="hidden sm:inline">{h.label}</span>
                  <span className="sm:hidden">{h.short ?? h.label}</span>
                </th>
              ))}
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <tr key={i} className="row-fade h-11">
                  <td colSpan={headers.length + 2} className="pl-4">
                    <Skeleton className="h-3 w-1/2" />
                  </td>
                </tr>
              ))
            ) : isEmpty ? (
              <tr>
                <td
                  colSpan={headers.length + 2}
                  className="px-4 py-6 text-sm text-muted-foreground"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
