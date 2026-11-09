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
  // ! spec 63: present when the trend was fetched for a fixed calendar year
  // ! (?targetYear=YYYY → 12 entries Jan→Dec). Absent on the rolling ?months=N rail.
  targetYear?: string;
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
  // ! Spec 60/61: litres for a fuel record, null for every other source. Mirrors the
  // ! server's `TSpendingRecord`. The PDF export (via TSpendingDetails) ignores it.
  liters: number | null;
}

// ─── Spec 38 — Month-tab category drill-down (server spec 60) ───
export interface TSpendingCategoryGroup {
  category: string;
  total: number;
  records: TSpendingRecord[];
}

export interface TMonthlyCategoryBreakdown {
  period: "month";
  targetMonth: string;
  totalSpending: number;
  categories: TSpendingCategoryGroup[];
}

// ─── Spec 39 — Year/Lifetime time-bucket drill-down (server spec 61) ───
export interface TSpendingPeriodBucket {
  key: string; // "2026-01" (month) | "2026" (year)
  label: string; // "Jan" | "2026" — pre-formatted server-side, render raw
  total: number;
  liters: number | null;
}

export interface TSpendingPeriodGroup {
  category: string;
  total: number;
  totalLiters: number | null;
  buckets: TSpendingPeriodBucket[];
}

export interface TPeriodCategoryBreakdown {
  period: "year" | "lifetime";
  targetYear?: string;
  totalSpending: number;
  categories: TSpendingPeriodGroup[];
}

export interface TSpendingDetails {
  period: "month" | "year" | "lifetime";
  targetMonth?: string;
  targetYear?: string;
  totalSpending: number;
  categoryBreakdown: TCategoryBreakdown[];
  records: TSpendingRecord[];
}