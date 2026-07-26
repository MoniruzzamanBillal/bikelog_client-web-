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