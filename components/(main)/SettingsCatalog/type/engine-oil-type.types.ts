export interface TEngineOilType {
  _id: string;
  name: string;
  suggestedIntervalKm: number;
  createdAt: string;
  updatedAt: string;
}

export interface TCreateEngineOilTypePayload {
  name: string;
  suggestedIntervalKm: number;
}
