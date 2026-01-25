import { z } from "zod";
import { idSchema, periodSchema, dateRangeSchema } from "./common";
import { breastSideSchema } from "./feeding";

export const startPumpingSchema = z.object({
  childId: idSchema,
  side: breastSideSchema.optional(),
  startTime: z.coerce.date().optional(),
});
export type StartPumpingInput = z.infer<typeof startPumpingSchema>;

export const endPumpingSchema = z.object({
  id: idSchema,
  endTime: z.coerce.date().optional(),
  amountMl: z.number().min(0).max(500).optional(),
  notes: z.string().max(500).optional(),
});
export type EndPumpingInput = z.infer<typeof endPumpingSchema>;

export const logPumpingSchema = z.object({
  childId: idSchema,
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  amountMl: z.number().min(0).max(500).optional(),
  side: breastSideSchema.optional(),
  notes: z.string().max(500).optional(),
});
export type LogPumpingInput = z.infer<typeof logPumpingSchema>;

export const updatePumpingSchema = z.object({
  id: idSchema,
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional().nullable(),
  amountMl: z.number().min(0).max(500).optional().nullable(),
  side: breastSideSchema.optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
export type UpdatePumpingInput = z.infer<typeof updatePumpingSchema>;

export const deletePumpingSchema = z.object({
  id: idSchema,
});
export type DeletePumpingInput = z.infer<typeof deletePumpingSchema>;

export const getPumpingRecordsSchema = z.object({
  childId: idSchema,
  period: periodSchema.optional(),
  dateRange: dateRangeSchema.optional(),
});
export type GetPumpingRecordsInput = z.infer<typeof getPumpingRecordsSchema>;

export const pumpingSummarySchema = z.object({
  childId: idSchema,
  period: periodSchema.default("today"),
});
export type PumpingSummaryInput = z.infer<typeof pumpingSummarySchema>;
