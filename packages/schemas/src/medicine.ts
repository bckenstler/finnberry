import { z } from "zod";
import { idSchema, dateRangeSchema } from "./common";

export const createMedicineSchema = z.object({
  childId: idSchema,
  name: z.string().min(1).max(100),
  dosage: z.string().min(1).max(100),
  frequency: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});
export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;

export const updateMedicineSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(100).optional(),
  dosage: z.string().min(1).max(100).optional(),
  frequency: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;

export const deleteMedicineSchema = z.object({
  id: idSchema,
});
export type DeleteMedicineInput = z.infer<typeof deleteMedicineSchema>;

export const getMedicinesSchema = z.object({
  childId: idSchema,
  activeOnly: z.boolean().default(true),
});
export type GetMedicinesInput = z.infer<typeof getMedicinesSchema>;

export const logMedicineRecordSchema = z.object({
  medicineId: idSchema,
  time: z.coerce.date().optional(),
  dosageGiven: z.string().max(100).optional(),
  skipped: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});
export type LogMedicineRecordInput = z.infer<typeof logMedicineRecordSchema>;

export const updateMedicineRecordSchema = z.object({
  id: idSchema,
  time: z.coerce.date().optional(),
  dosageGiven: z.string().max(100).optional().nullable(),
  skipped: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
});
export type UpdateMedicineRecordInput = z.infer<typeof updateMedicineRecordSchema>;

export const deleteMedicineRecordSchema = z.object({
  id: idSchema,
});
export type DeleteMedicineRecordInput = z.infer<typeof deleteMedicineRecordSchema>;

export const getMedicineRecordsSchema = z.object({
  medicineId: idSchema,
  dateRange: dateRangeSchema.optional(),
});
export type GetMedicineRecordsInput = z.infer<typeof getMedicineRecordsSchema>;
