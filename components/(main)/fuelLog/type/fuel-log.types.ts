import { TCloudinaryImage } from "@/components/shared/type/image.types";

export interface TFuelLog {
  _id: string;
  bike: string;
  odometerReading: number;
  litersAdded: number;
  isFullTank: boolean;
  pricePerLiter: number;
  totalCost: number;
  // ! server-computed per LIST row (`bikelog_server` spec 57), mirroring the app's
  // ! `TFuelLog`. `kmOnThisFill` is the NEXT fill-up's odometer reading minus this one's —
  // ! how far this tank actually carried the bike — and `costPerKm` is this fill-up's money
  // ! over that distance. Explicit `null` on the newest fill-up (period still open) and on
  // ! `GET /:id` (the lookup doesn't run), so guard with `!= null`. NOT mileage: km/l still
  // ! comes from the closed full-tank periods in the mileage history.
  kmOnThisFill?: number | null;
  costPerKm?: number | null;
  fuelStation?: string;
  date: string;
  notes?: string;
  receiptImage?: TCloudinaryImage;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TCreateFuelLogPayload {
  odometerReading: number;
  litersAdded: number;
  isFullTank: boolean;
  pricePerLiter: number;
  fuelStation?: string;
  date?: string;
  notes?: string;
}

export interface TUpdateFuelLogPayload {
  odometerReading?: number;
  litersAdded?: number;
  isFullTank?: boolean;
  pricePerLiter?: number;
  fuelStation?: string;
  date?: string;
  notes?: string;
}

export interface TMileageRecordClosed {
  _id: string;
  bike: string;
  startOdometer: number;
  endOdometer: number;
  distanceKm: number;
  litersConsumed: number;
  mileageKmPerLiter: number;
  periodStartDate: string;
  periodEndDate: string;
  fuelLogIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TCreateFuelLogResponse {
  fuelLog: TFuelLog;
  mileageRecordClosed: TMileageRecordClosed | null;
}

export interface TFuelLogsApiResponse {
  result: TFuelLog[];
  meta: number;
}
