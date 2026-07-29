"use client";

import FileGalleryField from "@/components/shared/input/FileGalleryField";
import { useDelete, usePost } from "@/hooks/useApi";
import { differenceInCalendarDays, format } from "date-fns";
import { SquarePen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TBikeDocument } from "./type/bike-document.types";

type TProps = {
  document: TBikeDocument;
  onEdit: (document: TBikeDocument) => void;
  onDelete: (document: TBikeDocument) => void;
};

const EXPIRY_SOON_THRESHOLD_DAYS = 30;

function ExpiryBadge({ expiryDate }: { expiryDate?: string }) {
  if (!expiryDate) return null;

  const daysRemaining = differenceInCalendarDays(
    new Date(expiryDate),
    new Date(),
  );

  if (daysRemaining < 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        Expired
      </span>
    );
  }

  if (daysRemaining <= EXPIRY_SOON_THRESHOLD_DAYS) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
        Expires in {daysRemaining} day{daysRemaining === 1 ? "" : "s"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
      Expires {format(new Date(expiryDate), "dd-MMM-yyyy")}
    </span>
  );
}

export default function BikeDocumentCard({
  document,
  onEdit,
  onDelete,
}: TProps) {
  const { mutateAsync: addFiles, isPending: isAdding } = usePost([
    ["bikeDocuments", document.bike],
  ]);
  const { mutateAsync: removeFile, isPending: isRemoving } = useDelete([
    ["bikeDocuments", document.bike],
  ]);

  const handleAddFiles = async (files: File[]) => {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      await addFiles({
        url: `/bikes/${document.bike}/documents/${document._id}/files`,
        payload: formData,
      });
      toast.success("Files added");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to add files");
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    try {
      await removeFile({
        url: `/bikes/${document.bike}/documents/${document._id}/files/${fileId}`,
      });
      toast.success("File deleted");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete file");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{document.title}</p>
            <ExpiryBadge expiryDate={document.expiryDate} />
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEdit(document)}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <SquarePen className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(document)}
            className="rounded p-1 text-muted-foreground hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {document.description && (
        <p className="mt-2 text-xs text-muted-foreground">
          {document.description}
        </p>
      )}

      <div className="mt-3">
        <FileGalleryField
          files={document.files ?? []}
          onAdd={handleAddFiles}
          onRemove={handleRemoveFile}
          uploading={isAdding || isRemoving}
        />
      </div>
    </div>
  );
}
