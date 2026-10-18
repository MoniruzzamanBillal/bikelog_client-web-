"use client";

import ImageUploadThumb from "@/components/shared/input/ImageUploadThumb";
import { useDelete, usePut } from "@/hooks/useApi";
import { toast } from "sonner";
import { TEngineOilLog } from "./type/engine-oil-log.types";

type TProps = {
  log: TEngineOilLog;
  compact?: boolean;
};

/**
 * FuelLogReceiptCell with the endpoint swapped. The receipt is deliberately NOT part of
 * the form — uploading it from the row keeps create a single request, as it is for fuel.
 *
 * ! On an IMPORTED row the stored `{ url, publicId }` was copied from the source
 * ! maintenance log's `serviceImage`, so until the server import's `--finalize` step runs
 * ! the asset has two owners and deleting it here would break that log's thumbnail too
 * ! (server spec 54 H8). The import is a hard prerequisite for shipping this screen.
 */
export default function EngineOilReceiptCell({ log, compact = true }: TProps) {
  const invalidateKeys = [
    ["engineOilLogs", log?.bike],
    ["engineOilStatus", log?.bike],
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
        url: `/bikes/${log?.bike}/engine-oil-logs/${log?._id}/image`,
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
        url: `/bikes/${log?.bike}/engine-oil-logs/${log?._id}/image`,
      });
      toast.success("Receipt image deleted");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete receipt image");
    }
  };

  return (
    <ImageUploadThumb
      imageUrl={log?.receiptImage?.url}
      onUpload={handleUpload}
      onDelete={handleDelete}
      uploading={isUploading || isDeleting}
      label="Receipt"
      compact={compact}
    />
  );
}
