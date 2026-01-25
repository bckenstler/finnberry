import { z } from "zod";
import { idSchema } from "./common";

export const genderSchema = z.enum(["MALE", "FEMALE", "OTHER"]);
export type Gender = z.infer<typeof genderSchema>;

export const createChildSchema = z.object({
  householdId: idSchema,
  name: z.string().min(1).max(100),
  birthDate: z.coerce.date(),
  gender: genderSchema.optional(),
  photo: z.string().url().optional(),
});
export type CreateChildInput = z.infer<typeof createChildSchema>;

export const updateChildSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(100).optional(),
  birthDate: z.coerce.date().optional(),
  gender: genderSchema.optional().nullable(),
  photo: z.string().url().optional().nullable(),
});
export type UpdateChildInput = z.infer<typeof updateChildSchema>;

export const deleteChildSchema = z.object({
  id: idSchema,
});
export type DeleteChildInput = z.infer<typeof deleteChildSchema>;

export const getChildSchema = z.object({
  id: idSchema,
});
export type GetChildInput = z.infer<typeof getChildSchema>;

export const listChildrenSchema = z.object({
  householdId: idSchema,
});
export type ListChildrenInput = z.infer<typeof listChildrenSchema>;
