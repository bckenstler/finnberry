import { z } from "zod";
import { idSchema } from "./common";

// PENDING is where an account starts; the admin only ever decides.
export const userDecisionSchema = z.enum(["APPROVED", "REJECTED"]);
export type UserDecision = z.infer<typeof userDecisionSchema>;

export const setUserStatusSchema = z.object({
  userId: idSchema,
  status: userDecisionSchema,
});
export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;
