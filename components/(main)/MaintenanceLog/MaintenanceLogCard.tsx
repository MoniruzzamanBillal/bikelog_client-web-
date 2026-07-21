"use client";

import { SquarePen, Trash2 } from "lucide-react";
import { TMaintenanceLog } from "./type/maintenance-log.types";

type TProps = {
  log: TMaintenanceLog;
  onEdit: (log: TMaintenanceLog) => void;
  onDelete: (log: TMaintenanceLog) => void;
};

function getTypeName(log: TMaintenanceLog): string {
  if (typeof log.maintenanceType === "object" && log.maintenanceType?.name) {
    return log.maintenanceType.name;
  }
  return "Maintenance";
}

export default function MaintenanceLogCard({ log, onEdit, onDelete }: TProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium">{getTypeName(log)}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(log.serviceDate).toLocaleDateString()} ·{" "}
            {log.odometerReading.toLocaleString()} km
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onEdit(log)}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <SquarePen className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(log)}
            className="rounded p-1 text-muted-foreground hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <p>Cost: ৳{log.cost.toLocaleString()}</p>
        <p>Interval: {log.intervalKmUsed.toLocaleString()} km</p>
        <p>Next due: {log.nextDueOdometer.toLocaleString()} km</p>
        {log.serviceCenter && <p>At: {log.serviceCenter}</p>}
      </div>

      {log.partsReplaced && log.partsReplaced.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Parts: {log.partsReplaced.join(", ")}
        </p>
      )}

      {log.notes && (
        <p className="mt-1 text-xs text-muted-foreground italic">
          {log.notes}
        </p>
      )}
    </div>
  );
}