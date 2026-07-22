// maintenance-log.schema.ts
import { z } from "zod";

export const maintenanceLogSchema = z.object({
  maintenanceType: z.string().min(1, "Maintenance type is required"),

  odometerReading: z
    .string()
    .min(1, "Odometer reading is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message:
        "Odometer reading must be a valid number greater than or equal to 0",
    })
    .refine((val) => Number(val) <= 999999, {
      message: "Odometer reading cannot exceed 999,999 km",
    }),

  oilType: z.string().optional(),

  intervalKmUsed: z
    .string()
    .min(1, "Service interval is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Service interval must be a positive number",
    })
    .refine((val) => Number(val) <= 50000, {
      message: "Service interval cannot exceed 50,000 km",
    }),

  cost: z
    .string()
    .min(1, "Cost is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Cost must be a valid number",
    })
    .refine((val) => Number(val) <= 999999, {
      message: "Cost cannot exceed 999,999",
    }),

  serviceDate: z
    .date({
      message: "Service date is required",
    })
    .refine((date) => date <= new Date(), {
      message: "Service date cannot be in the future",
    }),

  nextDueDate: z
    .date()
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        return date >= new Date();
      },
      {
        message: "Next due date must be in the future",
      },
    ),

  serviceCenter: z
    .string()
    .max(100, "Service center name cannot exceed 100 characters")
    .optional(),

  partsReplaced: z
    .string()
    .max(500, "Parts replaced list cannot exceed 500 characters")
    .optional(),

  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

export type TMaintenanceLogFormType = z.infer<typeof maintenanceLogSchema>;
