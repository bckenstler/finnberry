import { z } from "zod";
import { idSchema, dateRangeSchema } from "./common";

export const logGrowthSchema = z.object({
  childId: idSchema,
  date: z.coerce.date(),
  weightKg: z.number().min(0).max(50).optional(),
  heightCm: z.number().min(0).max(200).optional(),
  headCircumferenceCm: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});
export type LogGrowthInput = z.infer<typeof logGrowthSchema>;

export const updateGrowthSchema = z.object({
  id: idSchema,
  date: z.coerce.date().optional(),
  weightKg: z.number().min(0).max(50).optional().nullable(),
  heightCm: z.number().min(0).max(200).optional().nullable(),
  headCircumferenceCm: z.number().min(0).max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
export type UpdateGrowthInput = z.infer<typeof updateGrowthSchema>;

export const deleteGrowthSchema = z.object({
  id: idSchema,
});
export type DeleteGrowthInput = z.infer<typeof deleteGrowthSchema>;

export const getGrowthRecordsSchema = z.object({
  childId: idSchema,
  dateRange: dateRangeSchema.optional(),
});
export type GetGrowthRecordsInput = z.infer<typeof getGrowthRecordsSchema>;

export const getLatestGrowthSchema = z.object({
  childId: idSchema,
});
export type GetLatestGrowthInput = z.infer<typeof getLatestGrowthSchema>;
