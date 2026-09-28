"use client";

import ConfirmDeleteModal from "@/components/shared/Modal/ConfirmDeleteModal";
import PageHeader from "@/components/shared/PageHeader/PageHeader";
import StateCard from "@/components/shared/StateCard/StateCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDelete, useFetchData, usePost } from "@/hooks/useApi";
import { format } from "date-fns";
import {
  BookOpen,
  ExternalLink,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { TBike } from "../Bike/type/bike.types";
import { TBikeManualStatus } from "./type/bike-manual.types";

export default function BikeManual() {
  const { bikeId } = useParams<{ bikeId: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } =
    useFetchData<TBikeManualStatus>(
      ["bikeManual", bikeId],
      `/bikes/${bikeId}/manual`,
      { enabled: !!bikeId },
    );

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
  );

  const { mutateAsync: uploadManual, isPending: isUploading } = usePost([
    ["bikeManual", bikeId],
  ]);
  const { mutateAsync: deleteManual, isPending: isDeleting } = useDelete([
    ["bikeManual", bikeId],
  ]);

  const manual = data?.data?.manual;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const formData = new FormData();
      formData?.append("manual", file);
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
  const pickFile = () => !isBusy && inputRef?.current?.click();

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        title="Manual"
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: bikeData?.data?.nickname ?? "Bike",
            href: `/bikes/${bikeId}`,
          },
          { label: "Manual" },
        ]}
        description="One PDF per bike"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-[150px] rounded-[10px]" />
        </div>
      ) : isError ? (
        <StateCard
          variant="error"
          title="Couldn’t load the manual"
          message={error?.message}
          onRetry={() => refetch()}
        />
      ) : !manual ? (
        <button
          type="button"
          onClick={pickFile}
          disabled={isBusy}
          className="flex max-w-[620px] flex-col items-center justify-center gap-2.5 rounded-[10px] border border-dashed border-input px-6 py-11 text-center transition-colors hover:border-primary disabled:opacity-50"
        >
          <span className="grid size-11 place-items-center rounded-xl text-primary shadow-glow">
            {isUploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Upload className="size-5" />
            )}
          </span>
          <span className="text-base font-medium">
            {isUploading ? "Uploading…" : "Upload the owner’s manual"}
          </span>
          <span className="max-w-[380px] text-[13px] text-muted-foreground">
            A PDF of the manual. The AI Assistant will answer service questions
            from it.
          </span>
          <span className="mt-1 inline-flex h-10 items-center rounded-lg border border-primary px-3.5 text-sm font-medium text-primary">
            Choose PDF
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div className="panel flex flex-col gap-3.5 p-[18px]">
            <div className="flex items-center gap-3.5">
              <div className="grid h-16 w-[52px] shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
                <BookOpen className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium">{manual?.originalName}</div>
                <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                  Uploaded {format(new Date(manual?.uploadedAt), "dd MMM yyyy")}
                </div>
                <div className="mt-0.5 text-[12.5px] text-success">
                  {manual?.chunkCount} section
                  {manual?.chunkCount === 1 ? "" : "s"} indexed for AI chat
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="h-10" asChild>
                <a href={manual?.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  View PDF
                </a>
              </Button>
              <Button
                variant="outline"
                className="h-10"
                onClick={pickFile}
                disabled={isBusy}
              >
                {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
                Replace
              </Button>
              <Button
                variant="destructive"
                className="h-10"
                onClick={() => setConfirmOpen(true)}
                disabled={isBusy}
              >
                {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                Delete
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 rounded-[10px] bg-card p-[18px] shadow-glow">
            <div className="flex items-center gap-1.5 text-[11px] tracking-[0.1em] text-primary uppercase">
              <Sparkles className="size-3.5" />
              Grounds the AI Assistant
            </div>
            <p className="m-0 text-[13.5px] text-pretty">
              Questions like “What’s the recommended chain slack?” are answered
              from the most relevant pages of this manual.
            </p>
            <Link
              href={`/bikes/${bikeId}/assistant`}
              className="text-[13px] text-primary hover:underline"
            >
              Ask the AI Assistant →
            </Link>
          </div>
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
