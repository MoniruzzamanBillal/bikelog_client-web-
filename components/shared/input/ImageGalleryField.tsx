"use client";

import ImageLightbox from "@/components/shared/ImageLightbox/ImageLightbox";
import ConfirmDeleteModal from "@/components/shared/Modal/ConfirmDeleteModal";
import { cn } from "@/lib/utils";
import { Loader2, Plus, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
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
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  const handleRemoveClick = (imageId: string) => {
    setPendingRemoveId(imageId);
  };

  const handleConfirmRemove = async () => {
    if (pendingRemoveId) {
      const idToDelete = pendingRemoveId;
      setPendingRemoveId(null);
      setDeletingId(idToDelete);
      try {
        await onRemove(idToDelete);
      } finally {
        setDeletingId(null);
      }
    } else {
      setPendingRemoveId(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {images.map((image, index) => {
        const isDeleting = deletingId === image._id;

        return (
          <div key={image._id} className="relative size-16 shrink-0">
            <button
              type="button"
              onClick={() => setLightboxIndex(index)}
              className="size-full overflow-hidden rounded-md border border-border bg-muted"
              aria-label="View image"
            >
              <Image
                src={image.url}
                alt="Issue evidence"
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
            
            {isDeleting && (
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/50 backdrop-blur-sm">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
            )}

            {/* Positioned on the outer (non-clipping) wrapper so it isn't cut off by the inner thumbnail's overflow-hidden */}
            {!isDeleting && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveClick(image._id);
                }}
                className="absolute -right-1 -top-1 flex size-4 cursor-pointer items-center justify-center rounded-full bg-red-600"
                aria-label="Delete image"
              >
                <X className="size-3 text-white" />
              </button>
            )}
          </div>
        );
      })}

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
          {uploading && !deletingId ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Plus className="size-5" />
          )}
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

      <ConfirmDeleteModal
        open={pendingRemoveId !== null}
        onClose={() => setPendingRemoveId(null)}
        onConfirm={handleConfirmRemove}
        title="Delete image?"
        description="This will permanently remove this image and cannot be undone."
      />

      <ImageLightbox
        images={images.map((image) => ({ url: image.url }))}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}
