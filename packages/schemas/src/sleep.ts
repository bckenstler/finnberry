import { z } from "zod";
import { idSchema, periodSchema, dateRangeSchema } from "./common";

export const sleepTypeSchema = z.enum(["NAP", "NIGHT"]);
export type SleepType = z.infer<typeof sleepTypeSchema>;

export const qualitySchema = z.number().min(1).max(5);

export const startSleepSchema = z.object({
  childId: idSchema,
  sleepType: sleepTypeSchema.default("NAP"),
  startTime: z.coerce.date().optional(),
});
export type StartSleepInput = z.infer<typeof startSleepSchema>;

export const endSleepSchema = z.object({
  id: idSchema,
  endTime: z.coerce.date().optional(),
  quality: qualitySchema.optional(),
  notes: z.string().max(500).optional(),
});
export type EndSleepInput = z.infer<typeof endSleepSchema>;

export const logSleepSchema = z.object({
  childId: idSchema,
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  sleepType: sleepTypeSchema.default("NAP"),
  quality: qualitySchema.optional(),
  notes: z.string().max(500).optional(),
});
export type LogSleepInput = z.infer<typeof logSleepSchema>;

export const updateSleepSchema = z.object({
  id: idSchema,
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional().nullable(),
  sleepType: sleepTypeSchema.optional(),
  quality: qualitySchema.optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
export type UpdateSleepInput = z.infer<typeof updateSleepSchema>;

export const deleteSleepSchema = z.object({
  id: idSchema,
});
export type DeleteSleepInput = z.infer<typeof deleteSleepSchema>;

export const getSleepRecordsSchema = z.object({
  childId: idSchema,
  period: periodSchema.optional(),
  dateRange: dateRangeSchema.optional(),
});
export type GetSleepRecordsInput = z.infer<typeof getSleepRecordsSchema>;

export const getActiveSleepSchema = z.object({
  childId: idSchema,
});
export type GetActiveSleepInput = z.infer<typeof getActiveSleepSchema>;

export const sleepSummarySchema = z.object({
  childId: idSchema,
  period: periodSchema.default("today"),
});
export type SleepSummaryInput = z.infer<typeof sleepSummarySchema>;
