"use client";

import { Check, Eye, SquarePen, Trash2 } from "lucide-react";
import { TServiceLog } from "./type/service-log.types";

// Visible icon buttons, matching EngineOilRowActions (the developer's call on the oil screen).
// Service adds a Details (eye) on completed rows and a Mark-completed (check) on upcoming ones.
const iconBtn =
  "grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover";

type TProps = {
  log: TServiceLog;
  onDetails: (log: TServiceLog) => void;
  onEdit: (log: TServiceLog) => void;
  onDelete: (log: TServiceLog) => void;
  onComplete: (log: TServiceLog) => void;
};

export default function ServiceRowActions({
  log,
  onDetails,
  onEdit,
  onDelete,
  onComplete,
}: TProps) {
  const isCompleted = log?.serviceDate != null;

  return (
    <div className="flex justify-end gap-0.5">
      {isCompleted ? (
        <button
          type="button"
          onClick={() => onDetails(log)}
          className={iconBtn}
          title="Details"
          aria-label="Service details"
        >
          <Eye className="size-[15px]" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onComplete(log)}
          className={`${iconBtn} hover:text-success`}
          title="Mark completed"
          aria-label="Mark service completed"
        >
          <Check className="size-[15px]" />
        </button>
      )}
      <button
        type="button"
        onClick={() => onEdit(log)}
        className={iconBtn}
        title="Edit"
        aria-label="Edit service"
      >
        <SquarePen className="size-[15px]" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(log)}
        className={`${iconBtn} hover:text-destructive`}
        title="Delete"
        aria-label="Delete service"
      >
        <Trash2 className="size-[15px]" />
      </button>
    </div>
  );
}
