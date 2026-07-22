import { z } from "zod";

export const bikeAccessorySchema = z.object({
  name: z
    .string()
    .min(1, "Accessory name is required")
    .min(2, "Accessory name must be at least 2 characters")
    .max(100, "Accessory name cannot exceed 100 characters"),

  urgency: z
    .string()
    .min(1, "Urgency is required")
    .refine((val) => ["immediate", "medium", "low"].includes(val), {
      message: "Urgency must be one of: Immediate, Medium, or Low",
    }),

  status: z.enum(["pending", "purchased", "cancelled"]),
});

export type TBikeAccessoryFormType = z.infer<typeof bikeAccessorySchema>;
