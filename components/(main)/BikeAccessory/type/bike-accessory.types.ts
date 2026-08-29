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
