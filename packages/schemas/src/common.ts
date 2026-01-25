import { z } from "zod";

export const idSchema = z.string().cuid();

export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const dateRangeSchema = z.object({
  start: z.coerce.date(),
  end: z.coerce.date(),
});

export const periodSchema = z.enum(["today", "week", "month"]);
export type Period = z.infer<typeof periodSchema>;

export const timestampSchema = z.coerce.date();
