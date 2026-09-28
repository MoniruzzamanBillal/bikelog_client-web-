"use client";

import InsightCard from "@/components/shared/InsightCard/InsightCard";
import { useFetchData } from "@/hooks/useApi";
import { TSpendingInsight } from "./type/spending.types";

export default function AiSpendingInsightCard({
  bikeId,
  className,
}: {
  bikeId: string;
  className?: string;
}) {
  const { data, isLoading, isError } = useFetchData<TSpendingInsight>(
    ["ai", "spending-insight", bikeId],
    `/bikes/${bikeId}/ai/spending-insight`,
  );

  return (
    <InsightCard
      kicker="AI spending insight"
      text={data?.data?.insight}
      isLoading={isLoading}
      isError={isError}
      className={className}
    />
  );
}
