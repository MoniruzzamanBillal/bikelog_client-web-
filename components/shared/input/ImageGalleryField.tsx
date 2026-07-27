"use client";

import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { toast } from "sonner";

type TGalleryImage = { _id: string; url: string; publicId: string };

type TImageGalleryFieldProps = {
  images: TGalleryImage[];
  onAdd: (files: File[]) => void;
  onRemove: (imageId: string) => void;
  uploading: boolean;
  max?: number;
};

// server caps additions at 5 per POST request — mirrored here, not a stricter client invention
const MAX_IMAGES_PER_REQUEST = 5;

export default function ImageGalleryField({
  images,
  onAdd,
  onRemove,
  uploading,
  max = MAX_IMAGES_PER_REQUEST,
}: TImageGalleryFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = Math.max(max - images.length, 0);
    const selected = files.slice(0, remaining);

    if (files.length > selected.length) {
      toast.info(
        `Only ${remaining} more image${remaining === 1 ? "" : "s"} can be added right now (max ${max} total) — queued the first ${selected.length}.`,
      );
    }

    if (selected.length > 0) onAdd(selected);
    e.target.value = "";
  };

  const handleRemove = (imageId: string) => {
    if (confirm("Delete this image?")) onRemove(imageId);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {images.map((image) => (
        <div key={image._id} className="relative size-16 shrink-0">
          <div className="size-full overflow-hidden rounded-md border border-border bg-muted">
            <Image
              src={image.url}
              alt="Issue evidence"
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>
          {/* Positioned on the outer (non-clipping) wrapper so it isn't cut off by the inner thumbnail's overflow-hidden */}
          <button
            type="button"
            onClick={() => handleRemove(image._id)}
            className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-600"
            aria-label="Delete image"
          >
            <X className="size-3 text-white" />
          </button>
        </div>
      ))}

      {images.length < max && (
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:border-primary",
            uploading && "opacity-50",
          )}
          aria-label="Add evidence photo"
        >
          <Plus className="size-5" />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
    </div>
  );
}
