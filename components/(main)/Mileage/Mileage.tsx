"use client";

import PageHeader from "@/components/shared/PageHeader/PageHeader";
import SegmentedTabs from "@/components/shared/SegmentedTabs/SegmentedTabs";
import { useFetchData } from "@/hooks/useApi";
import { useParams } from "next/navigation";
import { useState } from "react";
import { TBike } from "../Bike/type/bike.types";
import AiMileageInsightCard from "./AiMileageInsightCard";
import LifetimeMileageTab, { LifetimeRail } from "./LifetimeMileageTab";
import MileageHistoryTab from "./MileageHistoryTab";
import MileageTrendTab from "./MileageTrendTab";
import MonthlyMileageTab from "./MonthlyMileageTab";
import YearlyMileageTab from "./YearlyMileageTab";

type TTab = "history" | "monthly" | "yearly" | "lifetime" | "trends";

const tabs: { value: TTab; label: string }[] = [
  { value: "history", label: "History" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "lifetime", label: "Lifetime" },
  { value: "trends", label: "Trends" },
];

export default function Mileage() {
  const params = useParams();
  const bikeId = params.bikeId as string;
  const [activeTab, setActiveTab] = useState<TTab>("history");

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        className="hidden lg:flex"
        title="Mileage"
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: bikeData?.data?.nickname ?? "Bike",
            href: `/bikes/${bikeId}`,
          },
          { label: "Mileage" },
        ]}
      />

      <SegmentedTabs
        value={activeTab}
        onChange={setActiveTab}
        options={tabs}
        className="self-start"
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-3">
          {activeTab === "history" && <MileageHistoryTab bikeId={bikeId} />}
          {activeTab === "monthly" && <MonthlyMileageTab bikeId={bikeId} />}
          {activeTab === "yearly" && <YearlyMileageTab bikeId={bikeId} />}
          {activeTab === "lifetime" && <LifetimeMileageTab bikeId={bikeId} />}
          {activeTab === "trends" && <MileageTrendTab bikeId={bikeId} />}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <AiMileageInsightCard bikeId={bikeId} />
          <LifetimeRail bikeId={bikeId} className="hidden lg:flex" />
        </div>
      </div>
    </div>
  );
}
