"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

type TImageLightboxProps = {
  images: { url: string; publicId?: string }[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
};

export default function ImageLightbox({
  images,
  initialIndex,
  open,
  onClose,
}: TImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Reset to the clicked thumbnail's index whenever the lightbox opens (or the
  // caller points it at a different image while it's already open). Adjusted
  // during render rather than in a useEffect — React's documented pattern for
  // "reset state when a prop changes" (https://react.dev/learn/you-might-not-need-an-effect),
  // same approach `AiAssistant.tsx` already uses in this codebase for the
  // equivalent "reset on prop change" case, since calling setState directly
  // inside an effect body trips `react-hooks/set-state-in-effect` as an error.
  const resetKey = `${open}|${initialIndex}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    if (open) setCurrentIndex(initialIndex);
  }

  const hasMultiple = images.length > 1;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === images.length - 1;

  const goPrev = () => {
    if (!isFirst) setCurrentIndex((i) => i - 1);
  };

  const goNext = () => {
    if (!isLast) setCurrentIndex((i) => i + 1);
  };

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isFirst, isLast]);

  const currentImage = images[currentIndex];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 h-dvh max-h-dvh w-dvw max-w-dvw translate-x-0 translate-y-0 gap-0 rounded-none border-none bg-black/90 p-0 sm:max-w-dvw"
      >
        {currentImage && (
          <div
            className="relative flex h-full w-full items-center justify-center"
            onClick={onClose}
          >
            <div className="relative h-full w-full">
              <Image
                src={currentImage.url}
                alt="Full-size view"
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>

            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  disabled={isFirst}
                  className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white disabled:cursor-not-allowed disabled:opacity-30 sm:left-4"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  disabled={isLast}
                  className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white disabled:cursor-not-allowed disabled:opacity-30 sm:right-4"
                  aria-label="Next image"
                >
                  <ChevronRight className="size-5" />
                </button>

                <div
                  className={cn(
                    "absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white",
                  )}
                >
                  {currentIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
