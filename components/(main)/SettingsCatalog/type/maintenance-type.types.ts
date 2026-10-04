export interface TMaintenanceType {
  _id: string;
  name: string;
  defaultIntervalKm?: number;
  defaultIntervalDays?: number;
  // ! Spec 30 §B / server spec 46 §G: replaces the old `name === "Engine Oil"` gate on the
  // ! engine-oil dropdown in MaintenanceLogFormModal. That string match only ever worked
  // ! because the global catalog happened to be seeded with that exact row; catalogs are
  // ! per-user now and a new account starts empty, so it could never fire again.
  requiresOilType: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TCreateMaintenanceTypePayload {
  name: string;
  defaultIntervalKm?: number;
  defaultIntervalDays?: number;
  requiresOilType?: boolean;
}

export interface TUpdateMaintenanceTypePayload {
  name?: string;
  defaultIntervalKm?: number | null;
  defaultIntervalDays?: number | null;
  requiresOilType?: boolean;
}
