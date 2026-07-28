"use client";

import ImageUploadThumb from "@/components/shared/input/ImageUploadThumb";
import { useDelete, usePut } from "@/hooks/useApi";
import { SquarePen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  TAccessoryStatus,
  TAccessoryUrgency,
  TBikeAccessory,
} from "./type/bike-accessory.types";

type TProps = {
  accessory: TBikeAccessory;
  onEdit: (accessory: TBikeAccessory) => void;
  onDelete: (accessory: TBikeAccessory) => void;
};

const ACCESSORY_STATUS_BADGE: Record<TAccessoryStatus, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  purchased:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const ACCESSORY_URGENCY_BADGE: Record<TAccessoryUrgency, string> = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  immediate: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const STATUS_LABEL: Record<TAccessoryStatus, string> = {
  pending: "Pending",
  purchased: "Purchased",
  cancelled: "Cancelled",
};

const URGENCY_LABEL: Record<TAccessoryUrgency, string> = {
  immediate: "Immediate",
  medium: "Medium",
  low: "Low",
};

export default function BikeAccessoryCard({
  accessory,
  onEdit,
  onDelete,
}: TProps) {
  const formatPrice = (price?: number) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const { mutateAsync: uploadImage, isPending: isUploading } = usePut([
    ["bikeAccessories", accessory.bike],
  ]);
  const { mutateAsync: deleteImage, isPending: isDeleting } = useDelete([
    ["bikeAccessories", accessory.bike],
  ]);

  const handleImageUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      await uploadImage({
        url: `/bikes/${accessory.bike}/accessories/${accessory._id}/image`,
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
        url: `/bikes/${accessory.bike}/accessories/${accessory._id}/image`,
      });
      toast.success("Product image deleted");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete image");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-3">
          <ImageUploadThumb
            imageUrl={accessory.productImage?.url}
            onUpload={handleImageUpload}
            onDelete={handleImageDelete}
            uploading={isUploading || isDeleting}
            label="Product"
          />
          <div>
            <p className="text-sm font-medium">{accessory.name}</p>
            <div className="mt-1 flex gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACCESSORY_URGENCY_BADGE[accessory.urgency]}`}
              >
                {URGENCY_LABEL[accessory.urgency]}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACCESSORY_STATUS_BADGE[accessory.status]}`}
              >
                {STATUS_LABEL[accessory.status]}
              </span>
              {accessory.price && (
                <span className="px-2 py-1 text-xs rounded-full font-medium bg-purple-100 text-purple-800">
                  {formatPrice(accessory.price)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEdit(accessory)}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <SquarePen className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(accessory)}
            className="rounded p-1 text-muted-foreground hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
