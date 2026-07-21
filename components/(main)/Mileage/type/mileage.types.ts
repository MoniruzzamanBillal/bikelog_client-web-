export interface TMileageRecord {
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

export interface TApproximateMileage {
  mileageKmPerLiter: number;
  basedOnFuelLogCount: number;
  isEstimate: boolean;
}

export interface TMileageHistoryResponse {
  exactRecords: TMileageRecord[];
  approximate: TApproximateMileage | null;
}

export interface TMonthlyMileage {
  targetMonth: string;
  totalDistanceKm: number;
  totalLitersConsumed: number;
  fuelLogCount: number;
}

export interface TMonthlySummary {
  targetMonth: string;
  totalDistanceKm: number;
  totalLitersConsumed: number;
  fuelLogCount: number;
}

export interface TYearlyMileage {
  targetYear: string;
  monthlySummary: TMonthlySummary[];
}

export interface TLifetimeMileage {
  totalDistanceKm: number;
  totalLitersConsumed: number;
  fuelLogCount: number;
}