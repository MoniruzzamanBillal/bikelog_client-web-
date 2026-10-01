export interface TEngineOilType {
  _id: string;
  name: string;
  suggestedIntervalKm: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TCreateEngineOilTypePayload {
  name: string;
  suggestedIntervalKm: number;
}

export interface TUpdateEngineOilTypePayload {
  name?: string;
  suggestedIntervalKm?: number;
}
