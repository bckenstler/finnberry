import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const deleteUserSchema = z.object({
  confirmEmail: z.string().email(),
});
export type DeleteUserInput = z.infer<typeof deleteUserSchema>;
