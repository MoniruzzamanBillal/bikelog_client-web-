"use client";

import ImageGalleryField from "@/components/shared/input/ImageGalleryField";
import StatusTag from "@/components/shared/StatusTag/StatusTag";
import { useDelete, usePost } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check, RotateCcw, SquarePen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TBikeIssue, TBikeIssueStatus } from "./type/bike-issue.types";

type TProps = {
  issue: TBikeIssue;
  onEdit: (issue: TBikeIssue) => void;
  onDelete: (issue: TBikeIssue) => void;
  onToggleStatus: (issue: TBikeIssue, nextStatus: TBikeIssueStatus) => void;
};

const iconBtn =
  "grid size-8 place-items-center rounded-md transition-colors hover:bg-surface-hover";

export default function BikeIssueCard({
  issue,
  onEdit,
  onDelete,
  onToggleStatus,
}: TProps) {
  const isOpen = issue?.status === "open";

  const { mutateAsync: addImages, isPending: isAdding } = usePost([
    ["bikeIssues", issue?.bike],
  ]);
  const { mutateAsync: removeImage, isPending: isRemoving } = useDelete([
    ["bikeIssues", issue?.bike],
  ]);

  const handleAddImages = async (files: File[]) => {
    try {
      const formData = new FormData();
      files?.forEach((file) => formData?.append("images", file));
      await addImages({
        url: `/bikes/${issue?.bike}/issues/${issue?._id}/images`,
        payload: formData,
      });
      toast.success("Images added");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to add images");
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    try {
      await removeImage({
        url: `/bikes/${issue?.bike}/issues/${issue?._id}/images/${imageId}`,
      });
      toast.success("Image deleted");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete image");
    }
  };

  return (
    <div className="panel flex flex-col gap-2.5 p-3.5">
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{issue?.title}</span>
            <StatusTag tone={isOpen ? "warning" : "success"}>
              {isOpen ? "Open" : "Resolved"}
            </StatusTag>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Reported {format(new Date(issue?.dateReported), "dd MMM yyyy")}
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5 text-muted-foreground">
          <button
            type="button"
            onClick={() => onEdit(issue)}
            className={iconBtn}
            title="Edit"
            aria-label="Edit issue"
          >
            <SquarePen className="size-[15px]" />
          </button>
          <button
            type="button"
            onClick={() => onToggleStatus(issue, isOpen ? "resolved" : "open")}
            className={cn(iconBtn, isOpen && "text-success")}
            title={isOpen ? "Mark resolved" : "Reopen"}
            aria-label={isOpen ? "Mark resolved" : "Reopen"}
          >
            {isOpen ? (
              <Check className="size-[15px]" />
            ) : (
              <RotateCcw className="size-[15px]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onDelete(issue)}
            className={cn(iconBtn, "hover:text-destructive")}
            title="Delete"
            aria-label="Delete issue"
          >
            <Trash2 className="size-[15px]" />
          </button>
        </div>
      </div>

      {issue?.description && (
        <p className="m-0 text-[13px] text-pretty text-muted-foreground">
          {issue?.description}
        </p>
      )}

      <ImageGalleryField
        images={issue?.images ?? []}
        onAdd={handleAddImages}
        onRemove={handleRemoveImage}
        uploading={isAdding || isRemoving}
      />
    </div>
  );
}
