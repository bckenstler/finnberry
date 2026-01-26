import { z } from "zod";
import { idSchema } from "./common";

// Input schemas for timeline procedures
export const getLastActivitiesSchema = z.object({
  childId: idSchema,
});
export type GetLastActivitiesInput = z.infer<typeof getLastActivitiesSchema>;

export const getDayTimelineSchema = z.object({
  childId: idSchema,
  date: z.coerce.date(),
});
export type GetDayTimelineInput = z.infer<typeof getDayTimelineSchema>;

export const getWeekTimelineSchema = z.object({
  childId: idSchema,
  weekStart: z.coerce.date(),
});
export type GetWeekTimelineInput = z.infer<typeof getWeekTimelineSchema>;

export const getListTimelineSchema = z.object({
  childId: idSchema,
  weekStart: z.coerce.date(),
});
export type GetListTimelineInput = z.infer<typeof getListTimelineSchema>;

// Activity type for unified timeline display
export const timelineActivityTypeSchema = z.enum([
  "SLEEP",
  "BREAST",
  "BOTTLE",
  "SOLIDS",
  "DIAPER",
]);
export type TimelineActivityType = z.infer<typeof timelineActivityTypeSchema>;
