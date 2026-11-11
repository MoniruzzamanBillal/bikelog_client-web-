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
  // ! spec 62: summed totalCost of the record's fuel logs. Absent on a pre-spec-62
  // ! server, so every money figure derived from it is guarded.
  totalFuelCost?: number;
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
  totalFuelCost?: number;
  fuelLogCount: number;
}

export interface TMonthlySummary {
  targetMonth: string;
  totalDistanceKm: number;
  totalLitersConsumed: number;
  totalFuelCost?: number;
  fuelLogCount: number;
}

export interface TYearlyMileage {
  targetYear: string;
  monthlySummary: TMonthlySummary[];
}

// ! spec 62: one entry per year on the Lifetime response (newest-first), same
// ! figures as a Yearly per-month row.
export interface TYearlyMileageSummary {
  targetYear: string;
  totalDistanceKm: number;
  totalLitersConsumed: number;
  totalFuelCost: number;
  fuelLogCount: number;
}

export interface TLifetimeMileage {
  totalDistanceKm: number;
  totalLitersConsumed: number;
  totalFuelCost?: number;
  fuelLogCount: number;
  // ! absent on a pre-spec-62 server → read with `?? []` so BY YEAR simply hides.
  yearlySummary?: TYearlyMileageSummary[];
}

export interface TMileageTrend {
  months: number;
  monthlySummary: TMonthlySummary[];
}

export interface TMileageInsight {
  insight: string;
  generated: boolean;
  cached: boolean;
}