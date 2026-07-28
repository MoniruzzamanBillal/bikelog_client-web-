"use client";

import ImageLightbox from "@/components/shared/ImageLightbox/ImageLightbox";
import ConfirmDeleteModal from "@/components/shared/Modal/ConfirmDeleteModal";
import { cn } from "@/lib/utils";
import { Image as ImageIcon, Loader2, Pencil, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

type TImageUploadThumbProps = {
  imageUrl?: string;
  onUpload: (file: File) => void;
  onDelete: () => void;
  uploading: boolean;
  label?: string;
  className?: string;
};

export default function ImageUploadThumb({
  imageUrl,
  onUpload,
  onDelete,
  uploading,
  label = "Image",
  className,
}: TImageUploadThumbProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  };

  const handleThumbClick = () => {
    if (uploading) return;
    // When an image is already set, clicking the thumbnail views it full-screen
    // instead of opening the file picker — replacing now lives on the pencil
    // overlay button below. With no image yet, there's nothing to view, so
    // click still opens the file picker as before.
    if (imageUrl) {
      setLightboxOpen(true);
    } else {
      inputRef.current?.click();
    }
  };

  const handleReplaceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!uploading) inputRef.current?.click();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    setConfirmOpen(false);
    onDelete();
  };

  return (
    <div className={cn("relative size-16 shrink-0", className)}>
      <div className="size-full overflow-hidden rounded-md border border-border bg-muted">
        <button
          type="button"
          onClick={handleThumbClick}
          disabled={uploading}
          className="flex size-full items-center justify-center"
          aria-label={imageUrl ? `View ${label}` : `Upload ${label}`}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={label}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ImageIcon className="size-4" />
              <span className="text-[10px]">{label}</span>
            </div>
          )}
        </button>

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="size-4 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Positioned on the outer (non-clipping) wrapper so it isn't cut off by the inner thumbnail's overflow-hidden */}
      {imageUrl && !uploading && (
        <div className="absolute -right-1 -top-1 flex gap-0.5">
          <button
            type="button"
            onClick={handleReplaceClick}
            className="flex size-4 cursor-pointer items-center justify-center rounded-full bg-primary"
            aria-label={`Replace ${label}`}
          >
            <Pencil className="size-2.5 text-primary-foreground" />
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            className="flex size-4 cursor-pointer items-center justify-center rounded-full bg-red-600"
            aria-label={`Delete ${label}`}
          >
            <X className="size-3 text-white" />
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />

      <ConfirmDeleteModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={`Delete ${label.toLowerCase()}?`}
        description={`This will permanently remove this ${label.toLowerCase()} and cannot be undone.`}
      />

      {imageUrl && (
        <ImageLightbox
          images={[{ url: imageUrl }]}
          initialIndex={0}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
