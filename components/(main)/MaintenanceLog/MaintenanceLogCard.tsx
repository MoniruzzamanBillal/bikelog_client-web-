"use client";

import ImageUploadThumb from "@/components/shared/input/ImageUploadThumb";
import StatusTag from "@/components/shared/StatusTag/StatusTag";
import { useDelete, usePut } from "@/hooks/useApi";
import { format } from "date-fns";
import { SquarePen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TMaintenanceType } from "../SettingsCatalog/type/maintenance-type.types";
import { TMaintenanceLog } from "./type/maintenance-log.types";

type TProps = {
  log: TMaintenanceLog;
  maintenanceTypes: TMaintenanceType[];
  onEdit: (log: TMaintenanceLog) => void;
  onDelete: (log: TMaintenanceLog) => void;
};

function getTypeName(
  log: TMaintenanceLog,
  maintenanceTypes: TMaintenanceType[],
): string {
  if (typeof log?.maintenanceType === "object" && log?.maintenanceType?.name) {
    return log?.maintenanceType?.name;
  }
  if (typeof log?.maintenanceType === "string") {
    const match = maintenanceTypes?.find((mt) => mt?._id === log?.maintenanceType);
    if (match) return match?.name;
  }
  return "Maintenance";
}

const iconBtn =
  "grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover";

export default function MaintenanceLogCard({
  log,
  maintenanceTypes,
  onEdit,
  onDelete,
}: TProps) {
  const { mutateAsync: uploadImage, isPending: isUploading } = usePut([
    ["maintenanceLogs", log?.bike],
  ]);
  const { mutateAsync: deleteImage, isPending: isDeleting } = useDelete([
    ["maintenanceLogs", log?.bike],
  ]);

  const handleImageUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData?.append("image", file);
      await uploadImage({
        url: `/bikes/${log?.bike}/maintenance-logs/${log?._id}/image`,
        payload: formData,
      });
      toast.success("Service image uploaded");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to upload image");
    }
  };

  const handleImageDelete = async () => {
    try {
      await deleteImage({
        url: `/bikes/${log?.bike}/maintenance-logs/${log?._id}/image`,
      });
      toast.success("Service image deleted");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete image");
    }
  };

  const oilName =
    typeof log?.oilType === "object" && log?.oilType?.name
      ? log?.oilType?.name
      : undefined;

  const nextDue =
    log?.nextDueOdometer != null
      ? `${log?.nextDueOdometer?.toLocaleString()} km`
      : log?.nextDueDate
        ? format(new Date(log?.nextDueDate), "dd MMM yyyy")
        : "—";

  const hasMeta =
    !!log?.serviceCenter || (log?.partsReplaced?.length ?? 0) > 0;

  return (
    <div className="panel flex flex-col gap-2.5 p-3.5">
      <div className="flex items-start gap-3">
        <ImageUploadThumb
          imageUrl={log?.serviceImage?.url}
          onUpload={handleImageUpload}
          onDelete={handleImageDelete}
          uploading={isUploading || isDeleting}
          label="Service"
          className="size-14"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {getTypeName(log, maintenanceTypes)}
            </span>
            {oilName && <StatusTag tone="accent">{oilName}</StatusTag>}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {format(new Date(log?.serviceDate), "dd MMM yyyy")} ·{" "}
            {log?.odometerReading?.toLocaleString()} km
          </div>
        </div>
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() => onEdit(log)}
            className={iconBtn}
            title="Edit"
            aria-label="Edit maintenance log"
          >
            <SquarePen className="size-[15px]" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(log)}
            className={`${iconBtn} hover:text-destructive`}
            title="Delete"
            aria-label="Delete maintenance log"
          >
            <Trash2 className="size-[15px]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs tabular-nums">
        <div>
          <div className="text-muted-foreground">Cost</div>
          <div className="text-[13.5px] font-medium">
            ৳{log?.cost?.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Interval</div>
          <div className="text-[13.5px]">
            {log?.intervalKmUsed != null
              ? `${log?.intervalKmUsed?.toLocaleString()} km`
              : "—"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Next due</div>
          <div className="text-[13.5px]">{nextDue}</div>
        </div>
      </div>

      {hasMeta && (
        <div className="hidden flex-wrap items-center gap-1.5 text-xs text-muted-foreground lg:flex">
          {log?.serviceCenter && <span>{log?.serviceCenter}</span>}
          {log?.partsReplaced?.map((part) => (
            <StatusTag key={part}>{part}</StatusTag>
          ))}
        </div>
      )}

      {log?.notes && (
        <p className="m-0 hidden text-[12.5px] text-pretty text-muted-foreground lg:block">
          {log?.notes}
        </p>
      )}
    </div>
  );
}
