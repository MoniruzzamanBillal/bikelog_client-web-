"use client";

import { SquarePen, Trash2 } from "lucide-react";
import { TEngineOilLog } from "./type/engine-oil-log.types";

// ! Edit/delete as two visible icon buttons rather than `TableActionMenu`'s 3-dot
// ! dropdown — the developer asked for the icons directly on this screen (2026-10-18).
// ! Same markup and the same `iconBtn` class as MaintenanceLogCard, which has always
// ! shown them this way, so the two screens now match.
// ! There is no lock rule for an oil change (unlike a fuel log inside a closed mileage
// ! period), so neither button is ever disabled and no footnote is needed — which is what
// ! makes dropping the dropdown lossless here.
const iconBtn =
  "grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover";

type TProps = {
  log: TEngineOilLog;
  onEdit: (log: TEngineOilLog) => void;
  onDelete: (log: TEngineOilLog) => void;
};

export default function EngineOilRowActions({
  log,
  onEdit,
  onDelete,
}: TProps) {
  return (
    <div className="flex justify-end gap-0.5">
      <button
        type="button"
        onClick={() => onEdit(log)}
        className={iconBtn}
        title="Edit"
        aria-label="Edit oil change"
      >
        <SquarePen className="size-[15px]" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(log)}
        className={`${iconBtn} hover:text-destructive`}
        title="Delete"
        aria-label="Delete oil change"
      >
        <Trash2 className="size-[15px]" />
      </button>
    </div>
  );
}
