"use client";

import EngineOilTypeSection from "./EngineOilTypeSection";
import MaintenanceTypeSection from "./MaintenanceTypeSection";

export default function Catalog() {
  return (
    <div className="space-y-8 p-4">
      <h1 className="text-lg font-semibold">Maintenance Catalog</h1>
      <MaintenanceTypeSection />
      <EngineOilTypeSection />
    </div>
  );
}
