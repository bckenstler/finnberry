import { createTRPCRouter } from "./trpc";
import { householdRouter } from "./routers/household";
import { childRouter } from "./routers/child";
import { sleepRouter } from "./routers/sleep";
import { feedingRouter } from "./routers/feeding";
import { diaperRouter } from "./routers/diaper";
import { pumpingRouter } from "./routers/pumping";
import { growthRouter } from "./routers/growth";
import { activityRouter } from "./routers/activity";
import { temperatureRouter } from "./routers/temperature";
import { medicineRouter } from "./routers/medicine";
import { userRouter } from "./routers/user";
import { timelineRouter } from "./routers/timeline";
import { adminRouter } from "./routers/admin";

export const appRouter = createTRPCRouter({
  household: householdRouter,
  child: childRouter,
  sleep: sleepRouter,
  feeding: feedingRouter,
  diaper: diaperRouter,
  pumping: pumpingRouter,
  growth: growthRouter,
  activity: activityRouter,
  temperature: temperatureRouter,
  medicine: medicineRouter,
  user: userRouter,
  timeline: timelineRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
