"use client";

import { cn } from "@/lib/utils";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete this ${label.toLowerCase()}?`)) onDelete();
  };

  return (
    <div className={cn("relative size-16 shrink-0", className)}>
      <div className="size-full overflow-hidden rounded-md border border-border bg-muted">
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className="flex size-full items-center justify-center"
          aria-label={imageUrl ? `Replace ${label}` : `Upload ${label}`}
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
        <button
          type="button"
          onClick={handleDelete}
          className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-600"
          aria-label={`Delete ${label}`}
        >
          <X className="size-3 text-white" />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
    </div>
  );
}
