"use client";

import ImageUploadThumb from "@/components/shared/input/ImageUploadThumb";
import { useDelete, usePut } from "@/hooks/useApi";
import { toast } from "sonner";
import { TFuelLog } from "./type/fuel-log.types";

type TProps = {
  fuelLog: TFuelLog;
};

export default function FuelLogReceiptCell({ fuelLog }: TProps) {
  const { mutateAsync: uploadImage, isPending: isUploading } = usePut([
    ["fuelLogs", fuelLog.bike],
  ]);
  const { mutateAsync: deleteImage, isPending: isDeleting } = useDelete([
    ["fuelLogs", fuelLog.bike],
  ]);

  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      await uploadImage({
        url: `/bikes/${fuelLog.bike}/fuel-logs/${fuelLog._id}/image`,
        payload: formData,
      });
      toast.success("Receipt image uploaded");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to upload receipt image");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteImage({
        url: `/bikes/${fuelLog.bike}/fuel-logs/${fuelLog._id}/image`,
      });
      toast.success("Receipt image deleted");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete receipt image");
    }
  };

  return (
    <ImageUploadThumb
      imageUrl={fuelLog.receiptImage?.url}
      onUpload={handleUpload}
      onDelete={handleDelete}
      uploading={isUploading || isDeleting}
      label="Receipt"
    />
  );
}
