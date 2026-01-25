import { createTRPCRouter } from "./trpc";
import { householdRouter } from "./routers/household";
import { childRouter } from "./routers/child";
import { sleepRouter } from "./routers/sleep";
import { feedingRouter } from "./routers/feeding";
import { diaperRouter } from "./routers/diaper";
import { pumpingRouter } from "./routers/pumping";
import { growthRouter } from "./routers/growth";
import { activityRouter } from "./routers/activity";
import { medicineRouter } from "./routers/medicine";

export const appRouter = createTRPCRouter({
  household: householdRouter,
  child: childRouter,
  sleep: sleepRouter,
  feeding: feedingRouter,
  diaper: diaperRouter,
  pumping: pumpingRouter,
  growth: growthRouter,
  activity: activityRouter,
  medicine: medicineRouter,
});

export type AppRouter = typeof appRouter;
