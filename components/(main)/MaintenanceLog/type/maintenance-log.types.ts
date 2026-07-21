export interface TMaintenanceLog {
  _id: string;
  bike: string;
  maintenanceType: { _id: string; name: string } | string;
  odometerReading: number;
  oilType?: { _id: string; name: string; suggestedIntervalKm: number } | string;
  intervalKmUsed: number;
  nextDueOdometer: number;
  nextDueDate?: string;
  cost: number;
  serviceDate: string;
  serviceCenter?: string;
  partsReplaced?: string[];
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TCreateMaintenanceLogPayload {
  maintenanceType: string;
  odometerReading: number;
  oilType?: string;
  intervalKmUsed: number;
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
  maintenanceType: { _id: string; name: string };
  lastServiceDate: string;
  lastOdometerReading: number;
  nextDueOdometer: number;
  nextDueDate?: string;
  status: "overdue" | "upcoming";
  kmRemaining: number;
  daysRemaining?: number;
}
