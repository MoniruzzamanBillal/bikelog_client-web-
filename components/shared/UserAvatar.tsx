"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";
import { TCloudinaryImage } from "./type/image.types";

/** First letters of the first two words, uppercased; `?` when there is no name. */
export const initials = (name?: string | null): string => {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
};

type TProps = {
  name?: string | null;
  image?: TCloudinaryImage | null;
  size: number;
  className?: string;
};

/**
 * A round avatar with an initials fallback — the look the app adopted from expenseTracker2.
 * Purpose-built (not a reused bike image picker, spec 36 D1): a circle with an initials
 * state. Falls back to initials when there is no photo OR the photo fails to load.
 */
export default function UserAvatar({ name, image, size, className }: TProps) {
  const [errored, setErrored] = useState(false);
  // reset the error whenever the url changes, so a replaced photo gets a fresh attempt.
  // ! the adjust-state-during-render pattern, not an effect (React's own guidance, and the
  // ! React-compiler lint forbids setState inside useEffect here).
  const [lastUrl, setLastUrl] = useState(image?.url);
  if (image?.url !== lastUrl) {
    setLastUrl(image?.url);
    setErrored(false);
  }

  const showImage = !!image?.url && !errored;

  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 font-medium text-primary select-none",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.38)),
      }}
    >
      {showImage ? (
        <Image
          src={image!.url}
          alt={name ?? "Profile photo"}
          fill
          sizes={`${size}px`}
          className="object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span className="tracking-[0.02em]">{initials(name)}</span>
      )}
    </div>
  );
}
