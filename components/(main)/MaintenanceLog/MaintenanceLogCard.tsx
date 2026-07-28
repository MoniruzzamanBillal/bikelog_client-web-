"use client";

import ImageUploadThumb from "@/components/shared/input/ImageUploadThumb";
import { useDelete, usePut } from "@/hooks/useApi";
import { SquarePen, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
  const { mutateAsync: uploadImage, isPending: isUploading } = usePut([
    ["maintenanceLogs", log.bike],
  ]);
  const { mutateAsync: deleteImage, isPending: isDeleting } = useDelete([
    ["maintenanceLogs", log.bike],
  ]);

  const handleImageUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      await uploadImage({
        url: `/bikes/${log.bike}/maintenance-logs/${log._id}/image`,
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
        url: `/bikes/${log.bike}/maintenance-logs/${log._id}/image`,
      });
      toast.success("Service image deleted");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete image");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <ImageUploadThumb
            imageUrl={log.serviceImage?.url}
            onUpload={handleImageUpload}
            onDelete={handleImageDelete}
            uploading={isUploading || isDeleting}
            label="Service"
          />
          <div>
            <p className="text-sm font-medium">{getTypeName(log)}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(log.serviceDate).toLocaleDateString()} ·{" "}
              {log.odometerReading.toLocaleString()} km
            </p>
          </div>
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