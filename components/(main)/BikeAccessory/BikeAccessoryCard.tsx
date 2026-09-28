"use client";

import ImageUploadThumb from "@/components/shared/input/ImageUploadThumb";
import StatusTag, { TStatusTone } from "@/components/shared/StatusTag/StatusTag";
import TableActionMenu from "@/components/shared/table/TableActionMenu";
import { useDelete, usePut } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  TAccessoryUrgency,
  TBikeAccessory,
} from "./type/bike-accessory.types";

type TProps = {
  accessory: TBikeAccessory;
  onEdit: (accessory: TBikeAccessory) => void;
  onDelete: (accessory: TBikeAccessory) => void;
};

const URGENCY: Record<TAccessoryUrgency, { label: string; tone: TStatusTone }> =
  {
    immediate: { label: "Immediate", tone: "danger" },
    medium: { label: "Medium", tone: "warning" },
    low: { label: "Low", tone: "neutral" },
  };

export default function BikeAccessoryCard({
  accessory,
  onEdit,
  onDelete,
}: TProps) {
  const { mutateAsync: uploadImage, isPending: isUploading } = usePut([
    ["bikeAccessories", accessory?.bike],
  ]);
  const { mutateAsync: deleteImage, isPending: isDeleting } = useDelete([
    ["bikeAccessories", accessory?.bike],
  ]);

  const handleImageUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData?.append("image", file);
      await uploadImage({
        url: `/bikes/${accessory?.bike}/accessories/${accessory?._id}/image`,
        payload: formData,
      });
      toast.success("Product image uploaded");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to upload image");
    }
  };

  const handleImageDelete = async () => {
    try {
      await deleteImage({
        url: `/bikes/${accessory?.bike}/accessories/${accessory?._id}/image`,
      });
      toast.success("Product image deleted");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete image");
    }
  };

  const urgency = URGENCY[accessory?.urgency];

  return (
    <div
      className={cn(
        "panel flex gap-3 p-3",
        accessory?.status === "cancelled" && "opacity-60",
      )}
    >
      <ImageUploadThumb
        imageUrl={accessory?.productImage?.url}
        onUpload={handleImageUpload}
        onDelete={handleImageDelete}
        uploading={isUploading || isDeleting}
        label="Product"
        className="size-14"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-1.5">
          <span className="min-w-0 truncate pt-1 text-[13.5px] font-medium">
            {accessory?.name}
          </span>
          <TableActionMenu
            rowData={accessory}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusTag tone={urgency?.tone}>{urgency?.label}</StatusTag>
          <span className="text-[12.5px] tabular-nums">
            {accessory?.price
              ? `৳${accessory?.price?.toLocaleString()}`
              : <span className="text-muted-foreground">No price</span>}
          </span>
        </div>
        {accessory?.status === "purchased" && accessory?.purchaseDate && (
          <div className="text-[11.5px] text-muted-foreground">
            Purchased {format(new Date(accessory?.purchaseDate), "dd MMM yyyy")}
          </div>
        )}
      </div>
    </div>
  );
}
