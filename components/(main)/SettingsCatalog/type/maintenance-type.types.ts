export interface TMaintenanceType {
  _id: string;
  name: string;
  defaultIntervalKm?: number;
  defaultIntervalDays?: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TCreateMaintenanceTypePayload {
  name: string;
  defaultIntervalKm?: number;
  defaultIntervalDays?: number;
}

export interface TUpdateMaintenanceTypePayload {
  name?: string;
  defaultIntervalKm?: number | null;
  defaultIntervalDays?: number | null;
}