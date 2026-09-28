"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { MoreHorizontal, SquarePen, Trash2 } from "lucide-react";
import { ReactNode } from "react";

type TableActionMenuProps<T> = {
  rowData: T;
  onEdit?: (data: T) => void;
  onDelete?: (data: T) => void;
  editLabel?: string;
  deleteLabel?: string;
  disabled?: boolean;
  footnote?: ReactNode;
};

export default function TableActionMenu<T>({
  rowData,
  onEdit,
  onDelete,
  editLabel = "Edit",
  deleteLabel = "Delete",
  disabled = false,
  footnote,
}: TableActionMenuProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Row actions"
        className="grid size-8 place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-hover hover:text-foreground data-[state=open]:bg-surface-hover"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {onEdit && (
          <DropdownMenuItem disabled={disabled} onClick={() => onEdit(rowData)}>
            <SquarePen />
            {editLabel}
          </DropdownMenuItem>
        )}

        {onDelete && (
          <DropdownMenuItem
            variant="destructive"
            disabled={disabled}
            onClick={() => onDelete(rowData)}
          >
            <Trash2 />
            {deleteLabel}
          </DropdownMenuItem>
        )}

        {footnote && (
          <div className="mt-1 border-t border-border px-2.5 pt-1.5 pb-2 text-[11.5px] leading-snug text-muted-foreground">
            {footnote}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
