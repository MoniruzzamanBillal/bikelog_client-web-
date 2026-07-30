"use client";

import ConfirmDeleteModal from "@/components/shared/Modal/ConfirmDeleteModal";
import { Button } from "@/components/ui/button";
import { useDelete, useFetchData, usePost } from "@/hooks/useApi";
import { format } from "date-fns";
import { BookOpen, ExternalLink, Loader2, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { TBikeManualStatus } from "./type/bike-manual.types";

export default function BikeManual() {
  const { bikeId } = useParams<{ bikeId: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading } = useFetchData<TBikeManualStatus>(
    ["bikeManual", bikeId],
    `/bikes/${bikeId}/manual`,
    { enabled: !!bikeId },
  );

  const { mutateAsync: uploadManual, isPending: isUploading } = usePost([
    ["bikeManual", bikeId],
  ]);
  const { mutateAsync: deleteManual, isPending: isDeleting } = useDelete([
    ["bikeManual", bikeId],
  ]);

  const status = data?.data;
  const manual = status?.manual;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("manual", file);
      await uploadManual({ url: `/bikes/${bikeId}/manual`, payload: formData });
      toast.success("Manual uploaded successfully");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to upload manual");
    }
  };

  const handleConfirmDelete = async () => {
    setConfirmOpen(false);
    try {
      await deleteManual({ url: `/bikes/${bikeId}/manual` });
      toast.success("Manual deleted successfully");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete manual");
    }
  };

  const isBusy = isUploading || isDeleting;

  if (isLoading) {
    return <p className="p-4 text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h1 className="text-lg font-semibold">Owner Manual</h1>

        {!manual ? (
          <button
            type="button"
            onClick={() => !isBusy && inputRef.current?.click()}
            disabled={isBusy}
            className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground hover:border-primary disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <BookOpen className="size-6" />
            )}
            <span className="text-sm">
              No manual uploaded yet — upload a PDF to let the AI Assistant
              answer questions from it
            </span>
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm font-medium">{manual.originalName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Uploaded {format(new Date(manual.uploadedAt), "dd-MMM-yyyy")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {manual.chunkCount} section
                {manual.chunkCount === 1 ? "" : "s"} indexed for AI chat
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={manual.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" />
                  View PDF
                </a>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => !isBusy && inputRef.current?.click()}
                disabled={isBusy}
              >
                {isUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Replace
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmOpen(true)}
                disabled={isBusy}
              >
                {isDeleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Delete
              </Button>
            </div>

            <Link
              href={`/bikes/${bikeId}/assistant`}
              className="inline-block text-sm text-primary underline-offset-4 hover:underline"
            >
              Ask the AI Assistant about this manual
            </Link>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={isBusy}
        />
      </div>

      <ConfirmDeleteModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete manual?"
        description="This will permanently remove this manual and cannot be undone. The AI Assistant will no longer be able to answer questions from it."
        isLoading={isDeleting}
      />
    </div>
  );
}
