import { z } from "zod";
import { idSchema, periodSchema, dateRangeSchema } from "./common";

export const diaperTypeSchema = z.enum(["WET", "DIRTY", "BOTH", "DRY"]);
export type DiaperType = z.infer<typeof diaperTypeSchema>;

export const diaperColorSchema = z.enum([
  "YELLOW",
  "GREEN",
  "BROWN",
  "BLACK",
  "RED",
  "WHITE",
  "OTHER",
]);
export type DiaperColor = z.infer<typeof diaperColorSchema>;

export const diaperConsistencySchema = z.enum([
  "WATERY",
  "LOOSE",
  "SOFT",
  "FORMED",
  "HARD",
]);
export type DiaperConsistency = z.infer<typeof diaperConsistencySchema>;

export const logDiaperSchema = z.object({
  childId: idSchema,
  time: z.coerce.date().optional(),
  diaperType: diaperTypeSchema,
  color: diaperColorSchema.optional(),
  consistency: diaperConsistencySchema.optional(),
  notes: z.string().max(500).optional(),
});
export type LogDiaperInput = z.infer<typeof logDiaperSchema>;

export const updateDiaperSchema = z.object({
  id: idSchema,
  time: z.coerce.date().optional(),
  diaperType: diaperTypeSchema.optional(),
  color: diaperColorSchema.optional().nullable(),
  consistency: diaperConsistencySchema.optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
export type UpdateDiaperInput = z.infer<typeof updateDiaperSchema>;

export const deleteDiaperSchema = z.object({
  id: idSchema,
});
export type DeleteDiaperInput = z.infer<typeof deleteDiaperSchema>;

export const getDiaperRecordsSchema = z.object({
  childId: idSchema,
  diaperType: diaperTypeSchema.optional(),
  period: periodSchema.optional(),
  dateRange: dateRangeSchema.optional(),
});
export type GetDiaperRecordsInput = z.infer<typeof getDiaperRecordsSchema>;

export const diaperSummarySchema = z.object({
  childId: idSchema,
  period: periodSchema.default("today"),
});
export type DiaperSummaryInput = z.infer<typeof diaperSummarySchema>;
