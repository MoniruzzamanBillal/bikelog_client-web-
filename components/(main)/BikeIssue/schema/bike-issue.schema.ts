// bike-issue.schema.ts
import { z } from "zod";

export const bikeIssueSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),

  description: z
    .string()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional(),

  dateReported: z.date().refine((date) => date <= new Date(), {
    message: "Purchase date cannot be in the future",
  }),
});

export type TBikeIssueFormType = z.infer<typeof bikeIssueSchema>;
