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

export type TSpendingRecordSource = "fuel" | "maintenance";

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