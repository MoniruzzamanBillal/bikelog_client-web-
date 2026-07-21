export interface TFuelLog {
  _id: string;
  bike: string;
  odometerReading: number;
  litersAdded: number;
  isFullTank: boolean;
  pricePerLiter: number;
  totalCost: number;
  fuelStation?: string;
  date: string;
  notes?: string;
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
