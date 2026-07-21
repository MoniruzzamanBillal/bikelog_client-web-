export interface TMaintenanceType {
  _id: string;
  name: string;
  defaultIntervalKm?: number;
  defaultIntervalDays?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TCreateMaintenanceTypePayload {
  name: string;
  defaultIntervalKm?: number;
  defaultIntervalDays?: number;
}