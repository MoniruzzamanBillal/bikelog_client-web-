import { TCloudinaryImage } from "@/components/shared/type/image.types";

export interface TMaintenanceLog {
  _id: string;
  bike: string;
  maintenanceType: { _id: string; name: string } | string;
  odometerReading: number;
  // ! HISTORY ONLY since spec 33 §F. Engine oil is its own module now and this client
  // ! never sends or renders `oilType` on a maintenance log any more — but the field stays
  // ! declared: the server's spec 54 import soft-deletes the source oil logs rather than
  // ! deleting them, so they keep their oil type and the whole operation stays reversible
  // ! with one UPDATE. Deleting this would make those rows unreadable if they ever came back.
  oilType?: { _id: string; name: string; suggestedIntervalKm: number } | string;
  intervalKmUsed?: number | null;
  nextDueOdometer?: number | null;
  nextDueDate?: string;
  cost: number;
  serviceDate: string;
  serviceCenter?: string;
  partsReplaced?: string[];
  notes?: string;
  serviceImage?: TCloudinaryImage;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TCreateMaintenanceLogPayload {
  maintenanceType: string;
  odometerReading: number;
  // ! history only (spec 33 §F) — the API still accepts it, this client no longer sends it
  oilType?: string;
  intervalKmUsed?: number;
  nextDueDate?: string;
  cost: number;
  serviceDate?: string;
  serviceCenter?: string;
  partsReplaced?: string[];
  notes?: string;
}

export interface TUpdateMaintenanceLogPayload {
  maintenanceType?: string;
  odometerReading?: number;
  oilType?: string;
  intervalKmUsed?: number;
  nextDueDate?: string;
  cost?: number;
  serviceDate?: string;
  serviceCenter?: string;
  partsReplaced?: string[];
  notes?: string;
}

export interface TReminder {
  maintenanceType: { _id: string; name: string } | string;
  lastServiceDate: string;
  lastOdometerReading: number;
  nextDueOdometer?: number;
  nextDueDate?: string;
  status: "overdue" | "upcoming";
  kmRemaining?: number;
  daysRemaining?: number;
}
