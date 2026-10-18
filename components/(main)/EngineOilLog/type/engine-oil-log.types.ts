import { TCloudinaryImage } from "@/components/shared/type/image.types";

export interface TEngineOilLog {
  _id: string;
  bike: string;
  // ! three-way union, same as TMaintenanceLog's: the server populates `{ _id, name }` on
  // ! every read that includes the relation and falls back to the bare id otherwise
  // ! (server spec 41). Read it through `getOilName()` — `log.oilType.name` crashes on the
  // ! bare-id form.
  oilType: { _id: string; name: string } | string | null;
  odometerReading: number;
  intervalKmUsed?: number | null;
  nextDueOdometer?: number | null;
  quantityLiters?: number | null;
  oilFilterChanged: boolean;
  cost: number;
  changeDate: string;
  // ! server-computed per row (server spec 54 D12): how far this oil actually ran, closed
  // ! by the NEXT change, and what that worked out to per km. Both `null` on the newest
  // ! change, whose period is still open. Never derived here — the neighbouring change
  // ! sits on the previous page at every page boundary.
  kmOnThisOil?: number | null;
  costPerKm?: number | null;
  serviceCenter?: string;
  notes?: string;
  receiptImage?: TCloudinaryImage;
  importedFromMaintenanceLogId?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TCreateEngineOilLogPayload {
  oilType: string;
  odometerReading: number;
  intervalKmUsed?: number;
  quantityLiters?: number;
  oilFilterChanged?: boolean;
  cost: number;
  changeDate?: string;
  serviceCenter?: string;
  notes?: string;
}

export interface TUpdateEngineOilLogPayload {
  oilType?: string;
  odometerReading?: number;
  intervalKmUsed?: number;
  quantityLiters?: number;
  oilFilterChanged?: boolean;
  cost?: number;
  changeDate?: string;
  serviceCenter?: string;
  notes?: string;
}

export interface TEngineOilLogsApiResponse {
  result: TEngineOilLog[];
  meta: number;
}

// `GET /bikes/:bikeId/engine-oil-logs/status` — every figure is computed server-side on
// read, off the bike's live `currentOdometer`, so a Settings odometer update shows up here
// on the next request. Optional fields are OMITTED (not null) in the states where they
// cannot be derived, so presence is the test.
export interface TEngineOilStatus {
  status: "ok" | "upcoming" | "overdue" | "unknown";
  currentOdometer: number;
  lastChange: {
    _id: string;
    changeDate: string;
    odometerReading: number;
    oilType: { _id: string; name: string } | null;
    intervalKm?: number;
    nextDueOdometer?: number;
    oilFilterChanged: boolean;
  } | null;
  kmSinceChange?: number;
  // ! SIGNED, unlike the reminders endpoint's clamped figure — negative means past due.
  // ! Do not reconstruct the overshoot from `currentOdometer` the way RemindersBanner has
  // ! to; that would double-count it here.
  kmRemaining?: number;
  percentUsed?: number;
  projectedDaysRemaining?: number;
  projectedDueDate?: string;
  kmPerDay?: number;
  rateBasis?: { spanDays: number; distanceKm: number };
}

/** The oil type's display name, whichever of the three forms the server sent. */
export const getOilName = (
  oilType: TEngineOilLog["oilType"],
  fallback = "Engine oil",
): string => {
  if (oilType && typeof oilType === "object") return oilType?.name ?? fallback;
  return fallback;
};
