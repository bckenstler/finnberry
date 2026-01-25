import { z } from "zod";
import { idSchema, periodSchema, dateRangeSchema } from "./common";

export const feedingTypeSchema = z.enum(["BREAST", "BOTTLE", "SOLIDS"]);
export type FeedingType = z.infer<typeof feedingTypeSchema>;

export const breastSideSchema = z.enum(["LEFT", "RIGHT", "BOTH"]);
export type BreastSide = z.infer<typeof breastSideSchema>;

export const logBreastfeedingSchema = z.object({
  childId: idSchema,
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  side: breastSideSchema,
  notes: z.string().max(500).optional(),
});
export type LogBreastfeedingInput = z.infer<typeof logBreastfeedingSchema>;

export const startBreastfeedingSchema = z.object({
  childId: idSchema,
  side: breastSideSchema,
  startTime: z.coerce.date().optional(),
});
export type StartBreastfeedingInput = z.infer<typeof startBreastfeedingSchema>;

export const endBreastfeedingSchema = z.object({
  id: idSchema,
  endTime: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});
export type EndBreastfeedingInput = z.infer<typeof endBreastfeedingSchema>;

export const logBottleSchema = z.object({
  childId: idSchema,
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  amountMl: z.number().min(0).max(500),
  notes: z.string().max(500).optional(),
});
export type LogBottleInput = z.infer<typeof logBottleSchema>;

export const logSolidsSchema = z.object({
  childId: idSchema,
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  foodItems: z.array(z.string().min(1).max(100)).min(1).max(20),
  notes: z.string().max(500).optional(),
});
export type LogSolidsInput = z.infer<typeof logSolidsSchema>;

export const updateFeedingSchema = z.object({
  id: idSchema,
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional().nullable(),
  side: breastSideSchema.optional().nullable(),
  amountMl: z.number().min(0).max(500).optional().nullable(),
  foodItems: z.array(z.string()).optional(),
  notes: z.string().max(500).optional().nullable(),
});
export type UpdateFeedingInput = z.infer<typeof updateFeedingSchema>;

export const deleteFeedingSchema = z.object({
  id: idSchema,
});
export type DeleteFeedingInput = z.infer<typeof deleteFeedingSchema>;

export const getFeedingRecordsSchema = z.object({
  childId: idSchema,
  feedingType: feedingTypeSchema.optional(),
  period: periodSchema.optional(),
  dateRange: dateRangeSchema.optional(),
});
export type GetFeedingRecordsInput = z.infer<typeof getFeedingRecordsSchema>;

export const getActiveFeedingSchema = z.object({
  childId: idSchema,
});
export type GetActiveFeedingInput = z.infer<typeof getActiveFeedingSchema>;

export const feedingSummarySchema = z.object({
  childId: idSchema,
  period: periodSchema.default("today"),
});
export type FeedingSummaryInput = z.infer<typeof feedingSummarySchema>;
