// bike.schema.ts
import { z } from "zod";

export const bikeSchema = z.object({
  nickname: z
    .string()
    .min(1, "Nickname is required")
    .min(2, "Nickname must be at least 2 characters")
    .max(50, "Nickname cannot exceed 50 characters"),

  brand: z
    .string()
    .min(1, "Brand is required")
    .min(2, "Brand must be at least 2 characters")
    .max(50, "Brand cannot exceed 50 characters"),

  model: z
    .string()
    .min(1, "Model is required")
    .min(2, "Model must be at least 2 characters")
    .max(50, "Model cannot exceed 50 characters"),

  registrationNumber: z
    .string()
    .min(1, "Registration number is required")
    .min(3, "Registration number must be at least 3 characters")
    .max(20, "Registration number cannot exceed 20 characters"),

  purchaseDate: z.date().refine((date) => date <= new Date(), {
    message: "Purchase date cannot be in the future",
  }),

  fuelTankCapacityLiters: z
    .string()
    .min(1, "Fuel tank capacity is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Fuel tank capacity must be a positive number",
    })
    .refine((val) => Number(val) <= 100, {
      message: "Fuel tank capacity cannot exceed 100 liters",
    }),

  currentOdometer: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return !isNaN(Number(val)) && Number(val) >= 0;
      },
      {
        message: "Odometer must be a valid number",
      },
    )
    .refine(
      (val) => {
        if (!val) return true;
        return Number(val) <= 999999;
      },
      {
        message: "Odometer cannot exceed 999,999 km",
      },
    ),
});

export type TBikeFormType = z.infer<typeof bikeSchema>;
