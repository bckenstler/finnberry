import { z } from "zod";
import { idSchema, dateRangeSchema } from "./common";

export const logTemperatureSchema = z.object({
  childId: idSchema,
  time: z.coerce.date(),
  temperatureCelsius: z.number().min(30).max(45),
  notes: z.string().max(500).optional(),
});
export type LogTemperatureInput = z.infer<typeof logTemperatureSchema>;

export const updateTemperatureSchema = z.object({
  id: idSchema,
  time: z.coerce.date().optional(),
  temperatureCelsius: z.number().min(30).max(45).optional(),
  notes: z.string().max(500).optional().nullable(),
});
export type UpdateTemperatureInput = z.infer<typeof updateTemperatureSchema>;

export const deleteTemperatureSchema = z.object({
  id: idSchema,
});
export type DeleteTemperatureInput = z.infer<typeof deleteTemperatureSchema>;

export const getTemperatureRecordsSchema = z.object({
  childId: idSchema,
  dateRange: dateRangeSchema.optional(),
});
export type GetTemperatureRecordsInput = z.infer<typeof getTemperatureRecordsSchema>;

export const getLatestTemperatureSchema = z.object({
  childId: idSchema,
});
export type GetLatestTemperatureInput = z.infer<typeof getLatestTemperatureSchema>;
