"use client";

import InsightCard from "@/components/shared/InsightCard/InsightCard";
import { useFetchData } from "@/hooks/useApi";
import { TMileageInsight } from "./type/mileage.types";

export default function AiMileageInsightCard({
  bikeId,
  className,
}: {
  bikeId: string;
  className?: string;
}) {
  const { data, isLoading, isError } = useFetchData<TMileageInsight>(
    ["ai", "mileage-insight", bikeId],
    `/bikes/${bikeId}/ai/mileage-insight`,
  );

  return (
    <InsightCard
      kicker="AI mileage insight"
      text={data?.data?.insight}
      isLoading={isLoading}
      isError={isError}
      className={className}
    />
  );
}
