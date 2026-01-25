import { z } from "zod";
import { idSchema, periodSchema, dateRangeSchema } from "./common";

export const activityTypeSchema = z.enum([
  "TUMMY_TIME",
  "BATH",
  "OUTDOOR_PLAY",
  "INDOOR_PLAY",
  "SCREEN_TIME",
  "SKIN_TO_SKIN",
  "STORYTIME",
  "TEETH_BRUSHING",
  "OTHER",
]);
export type ActivityType = z.infer<typeof activityTypeSchema>;

export const startActivitySchema = z.object({
  childId: idSchema,
  activityType: activityTypeSchema,
  startTime: z.coerce.date().optional(),
});
export type StartActivityInput = z.infer<typeof startActivitySchema>;

export const endActivitySchema = z.object({
  id: idSchema,
  endTime: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});
export type EndActivityInput = z.infer<typeof endActivitySchema>;

export const logActivitySchema = z.object({
  childId: idSchema,
  activityType: activityTypeSchema,
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});
export type LogActivityInput = z.infer<typeof logActivitySchema>;

export const updateActivitySchema = z.object({
  id: idSchema,
  activityType: activityTypeSchema.optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

export const deleteActivitySchema = z.object({
  id: idSchema,
});
export type DeleteActivityInput = z.infer<typeof deleteActivitySchema>;

export const getActivityRecordsSchema = z.object({
  childId: idSchema,
  activityType: activityTypeSchema.optional(),
  period: periodSchema.optional(),
  dateRange: dateRangeSchema.optional(),
});
export type GetActivityRecordsInput = z.infer<typeof getActivityRecordsSchema>;

export const activitySummarySchema = z.object({
  childId: idSchema,
  period: periodSchema.default("today"),
});
export type ActivitySummaryInput = z.infer<typeof activitySummarySchema>;
