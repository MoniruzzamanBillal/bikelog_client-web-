import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

type TInsightCardProps = {
  kicker: string;
  text?: string;
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
};

/** Accent-kicker card for the AI mileage / spending insights (Nocturne design). */
export default function InsightCard({
  kicker,
  text,
  isLoading = false,
  isError = false,
  className,
}: TInsightCardProps) {
  return (
    <div className={cn("panel flex flex-col gap-2 px-[18px] py-4", className)}>
      <div className="flex items-center gap-1.5 text-[11px] tracking-[0.1em] text-primary uppercase">
        <Sparkles className="size-3.5" />
        {kicker}
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-2 py-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[92%]" />
          <Skeleton className="h-3 w-[60%]" />
        </div>
      ) : (
        <p className="m-0 text-[13.5px] leading-[1.55] text-pretty">
          {isError
            ? "Couldn’t generate an insight right now."
            : (text ?? "No insight available yet.")}
        </p>
      )}
    </div>
  );
}
