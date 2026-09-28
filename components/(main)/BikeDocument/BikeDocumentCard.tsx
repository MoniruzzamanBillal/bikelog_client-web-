"use client";

import FileGalleryField from "@/components/shared/input/FileGalleryField";
import StatusTag from "@/components/shared/StatusTag/StatusTag";
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

const iconBtn =
  "grid size-8 place-items-center rounded-md transition-colors hover:bg-surface-hover";

function ExpiryBadge({ expiryDate }: { expiryDate?: string }) {
  if (!expiryDate) return null;

  const daysRemaining = differenceInCalendarDays(
    new Date(expiryDate),
    new Date(),
  );

  if (daysRemaining < 0) {
    return <StatusTag tone="danger">Expired</StatusTag>;
  }

  if (daysRemaining <= EXPIRY_SOON_THRESHOLD_DAYS) {
    return (
      <StatusTag tone="warning">
        Expires in {daysRemaining} day{daysRemaining === 1 ? "" : "s"}
      </StatusTag>
    );
  }

  return (
    <StatusTag>Expires {format(new Date(expiryDate), "dd MMM yyyy")}</StatusTag>
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
    <div className="panel flex flex-col gap-2.5 p-3.5">
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{document.title}</span>
            <ExpiryBadge expiryDate={document.expiryDate} />
          </div>
          {document.description && (
            <p className="m-0 mt-0.5 text-[12.5px] text-muted-foreground">
              {document.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-0.5 text-muted-foreground">
          <button
            type="button"
            onClick={() => onEdit(document)}
            className={iconBtn}
            title="Edit"
            aria-label="Edit document"
          >
            <SquarePen className="size-[15px]" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(document)}
            className={`${iconBtn} hover:text-destructive`}
            title="Delete"
            aria-label="Delete document"
          >
            <Trash2 className="size-[15px]" />
          </button>
        </div>
      </div>

      <FileGalleryField
        files={document.files ?? []}
        onAdd={handleAddFiles}
        onRemove={handleRemoveFile}
        uploading={isAdding || isRemoving}
      />
    </div>
  );
}
