"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import LifetimeMileageTab from "./LifetimeMileageTab";
import MileageHistoryTab from "./MileageHistoryTab";
import MonthlyMileageTab from "./MonthlyMileageTab";
import YearlyMileageTab from "./YearlyMileageTab";

type TTab = "history" | "monthly" | "yearly" | "lifetime";

const tabs: { key: TTab; label: string }[] = [
  { key: "history", label: "History" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
  { key: "lifetime", label: "Lifetime" },
];

export default function Mileage() {
  const params = useParams();
  const bikeId = params.bikeId as string;
  const [activeTab, setActiveTab] = useState<TTab>("history");

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-semibold">Mileage</h1>

      <div className="flex gap-2 overflow-x-auto">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap ${
              activeTab === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-surface-text hover:bg-muted/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "history" && <MileageHistoryTab bikeId={bikeId} />}
      {activeTab === "monthly" && <MonthlyMileageTab bikeId={bikeId} />}
      {activeTab === "yearly" && <YearlyMileageTab bikeId={bikeId} />}
      {activeTab === "lifetime" && <LifetimeMileageTab bikeId={bikeId} />}
    </div>
  );
}
