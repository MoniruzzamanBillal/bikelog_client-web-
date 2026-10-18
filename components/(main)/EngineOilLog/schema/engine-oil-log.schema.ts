// engine-oil-log.schema.ts
// Follows fuel-log.schema.ts exactly: every numeric field is a z.string() with .refine()
// bounds rather than z.number(), because the inputs hand back strings and the payload does
// the Number() conversion at submit. The bounds mirror the server's so the two refuse the
// same things (server spec 54 §C).
import { z } from "zod";

export const engineOilLogSchema = z.object({
  oilType: z.string().min(1, "Engine oil type is required"),

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

  // ! REQUIRED here, unlike the maintenance form's optional interval. The field is
  // ! pre-filled from the selected oil type's suggestedIntervalKm and the rider may edit
  // ! it, but blanking it must block the submit rather than silently falling back to the
  // ! catalog server-side — the rider can always see the number that will be stored.
  intervalKmUsed: z
    .string()
    .min(1, "Interval is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Interval must be a positive number",
    })
    .refine((val) => Number(val) <= 100000, {
      message: "Interval cannot exceed 100,000 km",
    }),

  quantityLiters: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "Oil quantity must be a positive number",
    })
    .refine((val) => !val || Number(val) <= 20, {
      message: "Oil quantity cannot exceed 20 liters",
    }),

  oilFilterChanged: z.boolean(),

  cost: z
    .string()
    .min(1, "Cost is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Cost must be a valid number",
    })
    .refine((val) => Number(val) <= 9999999.99, {
      message: "Cost cannot exceed 9,999,999.99",
    }),

  changeDate: z
    .date({ message: "Change date is required" })
    .refine((date) => date <= new Date(), {
      message: "Date cannot be in the future",
    }),

  serviceCenter: z
    .string()
    .max(100, "Service center name cannot exceed 100 characters")
    .optional(),

  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

export type TEngineOilLogFormType = z.infer<typeof engineOilLogSchema>;
