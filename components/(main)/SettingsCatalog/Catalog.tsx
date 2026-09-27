"use client";

import PageHeader from "@/components/shared/PageHeader/PageHeader";
import EngineOilTypeSection from "./EngineOilTypeSection";
import MaintenanceTypeSection from "./MaintenanceTypeSection";

export default function Catalog() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Maintenance catalog"
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings / Catalog" },
        ]}
        description="Types shared by all your bikes"
      />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <MaintenanceTypeSection />
        <EngineOilTypeSection />
      </div>
    </div>
  );
}
