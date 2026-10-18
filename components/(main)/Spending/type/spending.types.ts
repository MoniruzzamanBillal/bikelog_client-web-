export interface TCategoryBreakdown {
  category: string;
  total: number;
}

export interface TSpendingSummary {
  period: "month" | "year" | "lifetime";
  targetMonth?: string;
  targetYear?: string;
  totalSpending: number;
  categoryBreakdown: TCategoryBreakdown[];
}

export interface TMonthlySpending {
  targetMonth: string;
  totalSpending: number;
  categoryBreakdown: TCategoryBreakdown[];
}

export interface TSpendingTrend {
  months: number;
  monthlySummary: TMonthlySpending[];
}

export interface TSpendingInsight {
  insight: string;
  generated: boolean;
  cached: boolean;
}

// ! Was `"fuel" | "maintenance"` and had been two values behind the server for a while:
// ! `spending.interface.ts` is `"fuel" | "maintenance" | "accessory" | "oil"` (accessory
// ! since server spec 25, oil since server spec 54). Nothing switches on this union, so
// ! the drift was harmless at runtime — type hygiene, not behaviour.
export type TSpendingRecordSource =
  | "fuel"
  | "maintenance"
  | "accessory"
  | "oil";

export interface TSpendingRecord {
  date: string;
  category: string;
  description: string;
  amount: number;
  vendor: string | null;
  remarks: string | null;
  source: TSpendingRecordSource;
}

export interface TSpendingDetails {
  period: "month" | "year" | "lifetime";
  targetMonth?: string;
  targetYear?: string;
  totalSpending: number;
  categoryBreakdown: TCategoryBreakdown[];
  records: TSpendingRecord[];
}