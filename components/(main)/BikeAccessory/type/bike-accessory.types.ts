import { TCloudinaryImage } from "@/components/shared/type/image.types";

export type TAccessoryUrgency = "immediate" | "medium" | "low";
export type TAccessoryStatus = "pending" | "purchased" | "cancelled";

export interface TBikeAccessory {
  _id: string;
  bike: string;
  name: string;
  urgency: TAccessoryUrgency;
  status: TAccessoryStatus;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  price?: number;
  // ! server-computed only — stamped the instant status transitions into "purchased", never client-sent
  purchaseDate?: string;
  productImage?: TCloudinaryImage;
}

export interface TCreateBikeAccessoryPayload {
  name: string;
  urgency: TAccessoryUrgency;
  status?: TAccessoryStatus;
  price?: number;
}

export interface TUpdateBikeAccessoryPayload {
  name?: string;
  urgency?: TAccessoryUrgency;
  status?: TAccessoryStatus;
  price?: number;
}

export interface TBikeAccessoriesApiResponse {
  result: TBikeAccessory[];
  meta: number;
}

// ! GET /bikes/:bikeId/accessories/spending-summary (bikelog_server spec 59). `months` is
// ! newest-first and contiguous from the earliest purchase to the current month — empty months
// ! are included (total 0, accessories []). `month` / `currentMonth` are "YYYY-MM".
export interface TAccessoryMonthGroup {
  month: string;
  total: number;
  accessories: TBikeAccessory[];
}

export interface TAccessorySpendingSummary {
  allTimeTotal: number;
  currentMonth: string;
  currentMonthTotal: number;
  months: TAccessoryMonthGroup[];
}
