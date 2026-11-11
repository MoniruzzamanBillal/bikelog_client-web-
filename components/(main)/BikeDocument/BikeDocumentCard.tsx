"use client";

import FileGalleryField from "@/components/shared/input/FileGalleryField";
import StatusTag, {
  TStatusTone,
} from "@/components/shared/StatusTag/StatusTag";
import { useDelete, usePost } from "@/hooks/useApi";
import { differenceInCalendarDays, format } from "date-fns";
import {
  CalendarClock,
  Clock,
  FileText,
  Paperclip,
  SquarePen,
  Trash2,
} from "lucide-react";
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

// Always returns a pill — every card carries an at-a-glance status, incl. "No expiry".
function getExpiryPill(expiryDate?: string): {
  tone: TStatusTone;
  label: string;
} {
  if (!expiryDate) return { tone: "neutral", label: "No expiry" };

  const daysRemaining = differenceInCalendarDays(
    new Date(expiryDate),
    new Date(),
  );

  if (daysRemaining < 0) return { tone: "danger", label: "Expired" };
  if (daysRemaining <= EXPIRY_SOON_THRESHOLD_DAYS) {
    return {
      tone: "warning",
      label: `Expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
    };
  }
  return { tone: "success", label: "Valid" };
}

export default function BikeDocumentCard({
  document,
  onEdit,
  onDelete,
}: TProps) {
  const { mutateAsync: addFiles, isPending: isAdding } = usePost([
    ["bikeDocuments", document?.bike],
  ]);
  const { mutateAsync: removeFile, isPending: isRemoving } = useDelete([
    ["bikeDocuments", document?.bike],
  ]);

  const handleAddFiles = async (files: File[]) => {
    try {
      const formData = new FormData();
      files?.forEach((file) => formData?.append("files", file));
      await addFiles({
        url: `/bikes/${document?.bike}/documents/${document?._id}/files`,
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
        url: `/bikes/${document?.bike}/documents/${document?._id}/files/${fileId}`,
      });
      toast.success("File deleted");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete file");
    }
  };

  const files = document?.files ?? [];
  const pill = getExpiryPill(document?.expiryDate);

  return (
    <div className="panel flex flex-col gap-2.5 p-3.5">
      <div className="flex items-start gap-2.5">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-muted-foreground">
          <FileText className="size-4" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="line-clamp-2 font-medium">{document?.title}</span>
          <StatusTag tone={pill.tone} className="self-start">
            {pill.label}
          </StatusTag>
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

      {document?.description && (
        <p className="m-0 text-[12.5px] text-muted-foreground">
          {document?.description}
        </p>
      )}

      {/* meta row — all the literal facts: expiry date · file count · date added */}
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-3.5 shrink-0" />
          {document?.expiryDate
            ? `Expires ${format(new Date(document?.expiryDate), "dd MMM yyyy")}`
            : "No expiry date"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Paperclip className="size-3.5 shrink-0" />
          {files.length} file{files.length === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0" />
          Added {format(new Date(document?.createdAt), "dd MMM yyyy")}
        </span>
      </div>

      <div className="border-t border-border/60 pt-2.5">
        <FileGalleryField
          files={files}
          onAdd={handleAddFiles}
          onRemove={handleRemoveFile}
          uploading={isAdding || isRemoving}
        />
      </div>
    </div>
  );
}
