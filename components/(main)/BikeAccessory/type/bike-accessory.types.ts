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
}

export interface TBikeAccessoriesApiResponse {
  result: TBikeAccessory[];
  meta: number;
}
