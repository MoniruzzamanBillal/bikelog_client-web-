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