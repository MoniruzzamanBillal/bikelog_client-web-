"use client";

import ImageLightbox from "@/components/shared/ImageLightbox/ImageLightbox";
import ConfirmDeleteModal from "@/components/shared/Modal/ConfirmDeleteModal";
import { cn } from "@/lib/utils";
import { FileText, Loader2, Plus, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

type TGalleryFile = {
  _id: string;
  url: string;
  publicId: string;
  resourceType: "image" | "raw";
  originalName: string;
  mimeType: string;
};

type TFileGalleryFieldProps = {
  files: TGalleryFile[];
  onAdd: (files: File[]) => void;
  onRemove: (fileId: string) => void;
  uploading: boolean;
  max?: number;
};

// server caps additions at 10 per POST request — mirrored here, not a stricter client invention
const MAX_FILES_PER_REQUEST = 10;

export default function FileGalleryField({
  files,
  onAdd,
  onRemove,
  uploading,
  max = MAX_FILES_PER_REQUEST,
}: TFileGalleryFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const imageFiles = files.filter((file) => file.resourceType === "image");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length === 0) return;

    const remaining = Math.max(max - files.length, 0);
    const selected = selectedFiles.slice(0, remaining);

    if (selectedFiles.length > selected.length) {
      toast.info(
        `Only ${remaining} more file${remaining === 1 ? "" : "s"} can be added right now (max ${max} total) — queued the first ${selected.length}.`,
      );
    }

    if (selected.length > 0) onAdd(selected);
    e.target.value = "";
  };

  const handleRemoveClick = (fileId: string) => {
    setPendingRemoveId(fileId);
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
      {files.map((file) => {
        const isImage = file.resourceType === "image";
        const isDeleting = deletingId === file._id;

        return (
          <div key={file._id} className="relative size-16 shrink-0">
            {isImage ? (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex(
                    imageFiles.findIndex((img) => img._id === file._id),
                  )
                }
                className="size-full overflow-hidden rounded-md border border-border bg-muted"
                aria-label="View image"
              >
                <Image
                  src={file.url}
                  alt={file.originalName}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ) : (
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-full flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-border bg-muted p-1"
                aria-label={`Open ${file.originalName}`}
              >
                <FileText className="size-5 shrink-0 text-muted-foreground" />
                <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                  {file.originalName}
                </span>
              </a>
            )}

            {isDeleting && (
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/50 backdrop-blur-sm">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
            )}

            {/* Positioned on the outer (non-clipping) wrapper so it isn't cut off by the inner tile's overflow-hidden */}
            {!isDeleting && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveClick(file._id);
                }}
                className="absolute -right-1 -top-1 flex size-4 cursor-pointer items-center justify-center rounded-full bg-red-600"
                aria-label="Delete file"
              >
                <X className="size-3 text-white" />
              </button>
            )}
          </div>
        );
      })}

      {files.length < max && (
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:border-primary",
            uploading && "opacity-50",
          )}
          aria-label="Add file"
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
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />

      <ConfirmDeleteModal
        open={pendingRemoveId !== null}
        onClose={() => setPendingRemoveId(null)}
        onConfirm={handleConfirmRemove}
        title="Delete file?"
        description="This will permanently remove this file and cannot be undone."
      />

      <ImageLightbox
        images={imageFiles.map((file) => ({ url: file.url }))}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}
