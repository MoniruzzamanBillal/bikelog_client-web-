// service-log.schema.ts (spec 44 §D)
// Numeric fields are z.string() with .refine() bounds (inputs hand back strings; the payload
// does Number() at submit), mirroring engine-oil-log.schema.ts. Cross-field rules live in a
// superRefine so the form refuses exactly what the server does (bikelog_server spec 67).
import { z } from "zod";

const itemSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  cost: z.string(),
});

const recommendationSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  targetDate: z.date().optional().nullable(),
  done: z.boolean(),
});

export const serviceLogSchema = z
  .object({
    serviceKind: z.enum(["warranty", "regular"]),
    warrantyNumber: z.string().optional(),
    dueDate: z.date().optional(),
    completed: z.boolean(),
    serviceDate: z.date().optional(),
    odometerReading: z.string().optional(),
    serviceCenter: z
      .string()
      .max(100, "Service centre cannot exceed 100 characters")
      .optional(),
    centerType: z.string().optional(), // "" | "official" | "local"
    items: z.array(itemSchema),
    recommendations: z.array(recommendationSchema),
    notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional(),
    nextServiceDue: z.date().optional(),
  })
  .superRefine((v, ctx) => {
    // at least one of due / service date (H-W-SVC-9)
    if (!v.dueDate && !(v.completed && v.serviceDate)) {
      ctx.addIssue({
        path: ["dueDate"],
        code: z.ZodIssueCode.custom,
        message: "Enter a due date or a service date",
      });
    }
    if (v.completed) {
      if (!v.serviceDate) {
        ctx.addIssue({
          path: ["serviceDate"],
          code: z.ZodIssueCode.custom,
          message: "Service date is required",
        });
      } else if (v.serviceDate > new Date()) {
        ctx.addIssue({
          path: ["serviceDate"],
          code: z.ZodIssueCode.custom,
          message: "Service date cannot be in the future",
        });
      }
      const n = Number(v.odometerReading);
      if (!v.odometerReading || isNaN(n) || n < 0) {
        ctx.addIssue({
          path: ["odometerReading"],
          code: z.ZodIssueCode.custom,
          message: "Enter a valid odometer reading",
        });
      } else if (n > 999999) {
        ctx.addIssue({
          path: ["odometerReading"],
          code: z.ZodIssueCode.custom,
          message: "Odometer reading cannot exceed 999,999 km",
        });
      }
    }
    if (v.serviceKind === "warranty" && v.warrantyNumber) {
      const n = Number(v.warrantyNumber);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        ctx.addIssue({
          path: ["warrantyNumber"],
          code: z.ZodIssueCode.custom,
          message: "Warranty number must be between 1 and 5",
        });
      }
    }
    v.items.forEach((it, i) => {
      if (!it.name.trim() && it.cost.trim()) {
        ctx.addIssue({
          path: ["items", i, "name"],
          code: z.ZodIssueCode.custom,
          message: "Item name is required",
        });
      }
      if (it.cost.trim()) {
        const c = Number(it.cost);
        if (isNaN(c) || c < 0 || c > 1000000) {
          ctx.addIssue({
            path: ["items", i, "cost"],
            code: z.ZodIssueCode.custom,
            message: "Enter a valid item cost",
          });
        }
      }
    });
    v.recommendations.forEach((r, i) => {
      if (!r.text.trim()) {
        ctx.addIssue({
          path: ["recommendations", i, "text"],
          code: z.ZodIssueCode.custom,
          message: "Recommendation text is required",
        });
      }
    });
  });

export type TServiceLogFormType = z.infer<typeof serviceLogSchema>;
