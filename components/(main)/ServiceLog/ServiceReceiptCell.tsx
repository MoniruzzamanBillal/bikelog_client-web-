"use client";

import ImageUploadThumb from "@/components/shared/input/ImageUploadThumb";
import { useDelete, usePut } from "@/hooks/useApi";
import { toast } from "sonner";
import { TServiceLog } from "./type/service-log.types";

type TProps = {
  log: TServiceLog;
  compact?: boolean;
};

/**
 * EngineOilReceiptCell with the endpoint swapped (D7). The receipt is uploaded from the row,
 * not the form, so create stays one request. Rendered only on a completed service.
 */
export default function ServiceReceiptCell({ log, compact = true }: TProps) {
  const invalidateKeys = [
    ["serviceLogs", log?.bike],
    ["serviceStatus", log?.bike],
  ];
  const { mutateAsync: uploadImage, isPending: isUploading } =
    usePut(invalidateKeys);
  const { mutateAsync: deleteImage, isPending: isDeleting } =
    useDelete(invalidateKeys);

  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData?.append("image", file);
      await uploadImage({
        url: `/bikes/${log?.bike}/service-logs/${log?._id}/image`,
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
        url: `/bikes/${log?.bike}/service-logs/${log?._id}/image`,
      });
      toast.success("Receipt image deleted");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete receipt image");
    }
  };

  return (
    <ImageUploadThumb
      imageUrl={log?.serviceImage?.url}
      onUpload={handleUpload}
      onDelete={handleDelete}
      uploading={isUploading || isDeleting}
      label="Receipt"
      compact={compact}
    />
  );
}
