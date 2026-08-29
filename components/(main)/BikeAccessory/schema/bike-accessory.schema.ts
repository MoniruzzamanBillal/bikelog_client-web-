import { z } from "zod";

export const bikeAccessorySchema = z
  .object({
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
    price: z
      .string()
      .optional()

      .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
        message: "Cost must be a valid number",
      })
      .refine((val) => !val || Number(val) <= 999999, {
        message: "Cost cannot exceed 999,999",
      }),
  })
  // ! mirrors the backend's own rule (spec 25): price becomes required the moment
  // ! status is "purchased" — fail fast client-side instead of round-tripping a 400
  .superRefine((data, ctx) => {
    if (data.status === "purchased" && !data.price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Price is required when marking an accessory as purchased",
      });
    }
  });

export type TBikeAccessoryFormType = z.infer<typeof bikeAccessorySchema>;
