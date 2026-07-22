// fuel-log.schema.ts
import { z } from "zod";

export const fuelLogSchema = z.object({
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

  litersAdded: z
    .string()
    .min(1, "Liters added is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Liters added must be a positive number",
    })
    .refine((val) => Number(val) <= 100, {
      message: "Liters added cannot exceed 100 liters",
    }),

  isFullTank: z.boolean(),

  pricePerLiter: z
    .string()
    .min(1, "Price per liter is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Price per liter must be a positive number",
    })
    .refine((val) => Number(val) <= 1000, {
      message: "Price per liter cannot exceed 1000",
    }),

  fuelStation: z
    .string()
    .max(100, "Fuel station name cannot exceed 100 characters")
    .optional(),

  date: z
    .date({
      message: "date is required!!!",
    })
    .refine((date) => date <= new Date(), {
      message: "Date cannot be in the future",
    }),

  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

export type TFuelLogFormType = z.infer<typeof fuelLogSchema>;
