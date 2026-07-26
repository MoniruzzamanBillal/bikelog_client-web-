"use client";

import { useFetchData } from "@/hooks/useApi";
import { TMileageInsight } from "./type/mileage.types";

export default function AiMileageInsightCard({ bikeId }: { bikeId: string }) {
  const { data, isLoading } = useFetchData<TMileageInsight>(
    ["ai", "mileage-insight", bikeId],
    `/bikes/${bikeId}/ai/mileage-insight`,
  );

  const insight = data?.data;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">AI Insight</p>
      <p className="mt-1 text-sm">
        {isLoading ? "Thinking..." : (insight?.insight ?? "No insight available yet.")}
      </p>
    </div>
  );
}
