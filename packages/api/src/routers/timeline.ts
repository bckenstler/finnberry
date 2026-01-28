import {
  getLastActivitiesSchema,
  getDayTimelineSchema,
  getWeekTimelineSchema,
  getListTimelineSchema,
} from "@finnberry/schemas";
import {
  startOfDay,
  endOfDay,
  addDays,
  addHours,
  format,
} from "@finnberry/utils";
import { createTRPCRouter, householdProcedure } from "../trpc";

// Day starts at 8am for baby timeline (sleep patterns often cross midnight)
const DAY_START_HOUR = 8;

function getTimelineDayBoundaries(date: Date): { start: Date; end: Date } {
  const dayStart = startOfDay(date);
  const start = addHours(dayStart, DAY_START_HOUR);
  const end = addHours(start, 24);
  return { start, end };
}

export const timelineRouter = createTRPCRouter({
  /**
   * Get last activities for each category (for Home view cards)
   * Returns the most recent activity of each type plus any active timers
   */
  getLastActivities: householdProcedure
    .input(getLastActivitiesSchema)
    .query(async ({ ctx, input }) => {
      // Fetch all data in parallel
      const [
        lastSleep,
        activeSleep,
        lastBreastfeeding,
        activeFeeding,
        lastBottle,
        lastSolids,
        lastDiaper,
        lastPumping,
        activePumping,
        lastMedicine,
        lastGrowth,
        lastTemperature,
        lastActivity,
      ] = await Promise.all([
        // Last completed sleep
        ctx.prisma.sleepRecord.findFirst({
          where: {
            childId: input.childId,
            endTime: { not: null },
          },
          orderBy: { endTime: "desc" },
        }),
        // Active sleep (no end time)
        ctx.prisma.sleepRecord.findFirst({
          where: {
            childId: input.childId,
            endTime: null,
          },
          orderBy: { startTime: "desc" },
        }),
        // Last completed breastfeeding
        ctx.prisma.feedingRecord.findFirst({
          where: {
            childId: input.childId,
            feedingType: "BREAST",
            endTime: { not: null },
          },
          orderBy: { endTime: "desc" },
        }),
        // Active breastfeeding
        ctx.prisma.feedingRecord.findFirst({
          where: {
            childId: input.childId,
            feedingType: "BREAST",
            endTime: null,
          },
          orderBy: { startTime: "desc" },
        }),
        // Last bottle feeding
        ctx.prisma.feedingRecord.findFirst({
          where: {
            childId: input.childId,
            feedingType: "BOTTLE",
          },
          orderBy: { startTime: "desc" },
        }),
        // Last solids feeding
        ctx.prisma.feedingRecord.findFirst({
          where: {
            childId: input.childId,
            feedingType: "SOLIDS",
          },
          orderBy: { startTime: "desc" },
        }),
        // Last diaper change
        ctx.prisma.diaperRecord.findFirst({
          where: {
            childId: input.childId,
          },
          orderBy: { time: "desc" },
        }),
        // Last completed pumping session
        ctx.prisma.pumpingRecord.findFirst({
          where: {
            childId: input.childId,
            endTime: { not: null },
          },
          orderBy: { endTime: "desc" },
        }),
        // Active pumping (no end time)
        ctx.prisma.pumpingRecord.findFirst({
          where: {
            childId: input.childId,
            endTime: null,
          },
          orderBy: { startTime: "desc" },
        }),
        // Last medicine record
        ctx.prisma.medicineRecord.findFirst({
          where: {
            medicine: {
              childId: input.childId,
            },
          },
          include: {
            medicine: true,
          },
          orderBy: { time: "desc" },
        }),
        // Last growth record
        ctx.prisma.growthRecord.findFirst({
          where: {
            childId: input.childId,
          },
          orderBy: { date: "desc" },
        }),
        // Last temperature record
        ctx.prisma.temperatureRecord.findFirst({
          where: {
            childId: input.childId,
          },
          orderBy: { time: "desc" },
        }),
        // Last activity record
        ctx.prisma.activityRecord.findFirst({
          where: {
            childId: input.childId,
            endTime: { not: null },
          },
          orderBy: { endTime: "desc" },
        }),
      ]);

      return {
        lastSleep,
        activeSleep,
        lastBreastfeeding,
        activeFeeding,
        lastBottle,
        lastSolids,
        lastDiaper,
        lastPumping,
        activePumping,
        lastMedicine,
        lastGrowth,
        lastTemperature,
        lastActivity,
      };
    }),

  /**
   * Get all activities for a specific day (for Day timeline view)
   * Day runs from 8am to 8am next day to capture overnight sleep
   */
  getDay: householdProcedure
    .input(getDayTimelineSchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getTimelineDayBoundaries(input.date);

      // Fetch all activities for this day in parallel
      const [
        sleepRecords,
        feedingRecords,
        diaperRecords,
        pumpingRecords,
        medicineRecords,
        growthRecords,
        temperatureRecords,
        activityRecords,
      ] = await Promise.all([
        ctx.prisma.sleepRecord.findMany({
          where: {
            childId: input.childId,
            OR: [
              // Started within the day
              { startTime: { gte: start, lt: end } },
              // Ended within the day
              { endTime: { gte: start, lt: end } },
              // Spans the entire day
              { startTime: { lt: start }, endTime: { gte: end } },
              // Active session that started before end of day
              { startTime: { lt: end }, endTime: null },
            ],
          },
          orderBy: { startTime: "asc" },
        }),
        ctx.prisma.feedingRecord.findMany({
          where: {
            childId: input.childId,
            startTime: { gte: start, lt: end },
          },
          orderBy: { startTime: "asc" },
        }),
        ctx.prisma.diaperRecord.findMany({
          where: {
            childId: input.childId,
            time: { gte: start, lt: end },
          },
          orderBy: { time: "asc" },
        }),
        ctx.prisma.pumpingRecord.findMany({
          where: {
            childId: input.childId,
            OR: [
              { startTime: { gte: start, lt: end } },
              { endTime: { gte: start, lt: end } },
              { startTime: { lt: start }, endTime: { gte: end } },
              { startTime: { lt: end }, endTime: null },
            ],
          },
          orderBy: { startTime: "asc" },
        }),
        ctx.prisma.medicineRecord.findMany({
          where: {
            medicine: { childId: input.childId },
            time: { gte: start, lt: end },
          },
          include: { medicine: true },
          orderBy: { time: "asc" },
        }),
        ctx.prisma.growthRecord.findMany({
          where: {
            childId: input.childId,
            date: { gte: start, lt: end },
          },
          orderBy: { date: "asc" },
        }),
        ctx.prisma.temperatureRecord.findMany({
          where: {
            childId: input.childId,
            time: { gte: start, lt: end },
          },
          orderBy: { time: "asc" },
        }),
        ctx.prisma.activityRecord.findMany({
          where: {
            childId: input.childId,
            OR: [
              { startTime: { gte: start, lt: end } },
              { endTime: { gte: start, lt: end } },
              { startTime: { lt: start }, endTime: { gte: end } },
              { startTime: { lt: end }, endTime: null },
            ],
          },
          orderBy: { startTime: "asc" },
        }),
      ]);

      return {
        date: input.date,
        dayStart: start,
        dayEnd: end,
        sleepRecords,
        feedingRecords,
        diaperRecords,
        pumpingRecords,
        medicineRecords,
        growthRecords,
        temperatureRecords,
        activityRecords,
      };
    }),

  /**
   * Get activities for a week (for Week grid view)
   * Returns data organized by day
   */
  getWeek: householdProcedure
    .input(getWeekTimelineSchema)
    .query(async ({ ctx, input }) => {
      const weekStart = startOfDay(input.weekStart);
      const weekEnd = addDays(weekStart, 7);

      // Fetch all activities for the week in parallel
      const [
        sleepRecords,
        feedingRecords,
        diaperRecords,
        pumpingRecords,
        medicineRecords,
        growthRecords,
        temperatureRecords,
        activityRecords,
      ] = await Promise.all([
        ctx.prisma.sleepRecord.findMany({
          where: {
            childId: input.childId,
            OR: [
              { startTime: { gte: weekStart, lt: weekEnd } },
              { endTime: { gte: weekStart, lt: weekEnd } },
              { startTime: { lt: weekStart }, endTime: { gte: weekEnd } },
              { startTime: { lt: weekEnd }, endTime: null },
            ],
          },
          orderBy: { startTime: "asc" },
        }),
        ctx.prisma.feedingRecord.findMany({
          where: {
            childId: input.childId,
            startTime: { gte: weekStart, lt: weekEnd },
          },
          orderBy: { startTime: "asc" },
        }),
        ctx.prisma.diaperRecord.findMany({
          where: {
            childId: input.childId,
            time: { gte: weekStart, lt: weekEnd },
          },
          orderBy: { time: "asc" },
        }),
        ctx.prisma.pumpingRecord.findMany({
          where: {
            childId: input.childId,
            OR: [
              { startTime: { gte: weekStart, lt: weekEnd } },
              { endTime: { gte: weekStart, lt: weekEnd } },
              { startTime: { lt: weekStart }, endTime: { gte: weekEnd } },
              { startTime: { lt: weekEnd }, endTime: null },
            ],
          },
          orderBy: { startTime: "asc" },
        }),
        ctx.prisma.medicineRecord.findMany({
          where: {
            medicine: { childId: input.childId },
            time: { gte: weekStart, lt: weekEnd },
          },
          include: { medicine: true },
          orderBy: { time: "asc" },
        }),
        ctx.prisma.growthRecord.findMany({
          where: {
            childId: input.childId,
            date: { gte: weekStart, lt: weekEnd },
          },
          orderBy: { date: "asc" },
        }),
        ctx.prisma.temperatureRecord.findMany({
          where: {
            childId: input.childId,
            time: { gte: weekStart, lt: weekEnd },
          },
          orderBy: { time: "asc" },
        }),
        ctx.prisma.activityRecord.findMany({
          where: {
            childId: input.childId,
            OR: [
              { startTime: { gte: weekStart, lt: weekEnd } },
              { endTime: { gte: weekStart, lt: weekEnd } },
              { startTime: { lt: weekStart }, endTime: { gte: weekEnd } },
              { startTime: { lt: weekEnd }, endTime: null },
            ],
          },
          orderBy: { startTime: "asc" },
        }),
      ]);

      // Organize by day
      const days: {
        date: string;
        dayStart: Date;
        sleepRecords: typeof sleepRecords;
        feedingRecords: typeof feedingRecords;
        diaperRecords: typeof diaperRecords;
        pumpingRecords: typeof pumpingRecords;
        medicineRecords: typeof medicineRecords;
        growthRecords: typeof growthRecords;
        temperatureRecords: typeof temperatureRecords;
        activityRecords: typeof activityRecords;
      }[] = [];

      for (let i = 0; i < 7; i++) {
        const dayDate = addDays(weekStart, i);
        const { start: dayStart, end: dayEnd } =
          getTimelineDayBoundaries(dayDate);
        const dateKey = format(dayDate, "yyyy-MM-dd");

        // Filter records for this day
        const daySleep = sleepRecords.filter((r) => {
          const inRange =
            (r.startTime >= dayStart && r.startTime < dayEnd) ||
            (r.endTime && r.endTime >= dayStart && r.endTime < dayEnd) ||
            (r.startTime < dayStart &&
              ((r.endTime && r.endTime >= dayEnd) || !r.endTime));
          return inRange;
        });

        const dayFeeding = feedingRecords.filter(
          (r) => r.startTime >= dayStart && r.startTime < dayEnd
        );

        const dayDiaper = diaperRecords.filter(
          (r) => r.time >= dayStart && r.time < dayEnd
        );

        const dayPumping = pumpingRecords.filter((r) => {
          const inRange =
            (r.startTime >= dayStart && r.startTime < dayEnd) ||
            (r.endTime && r.endTime >= dayStart && r.endTime < dayEnd) ||
            (r.startTime < dayStart &&
              ((r.endTime && r.endTime >= dayEnd) || !r.endTime));
          return inRange;
        });

        const dayMedicine = medicineRecords.filter(
          (r) => r.time >= dayStart && r.time < dayEnd
        );

        const dayGrowth = growthRecords.filter(
          (r) => r.date >= dayStart && r.date < dayEnd
        );

        const dayTemperature = temperatureRecords.filter(
          (r) => r.time >= dayStart && r.time < dayEnd
        );

        const dayActivity = activityRecords.filter((r) => {
          const inRange =
            (r.startTime >= dayStart && r.startTime < dayEnd) ||
            (r.endTime && r.endTime >= dayStart && r.endTime < dayEnd) ||
            (r.startTime < dayStart &&
              ((r.endTime && r.endTime >= dayEnd) || !r.endTime));
          return inRange;
        });

        days.push({
          date: dateKey,
          dayStart,
          sleepRecords: daySleep,
          feedingRecords: dayFeeding,
          diaperRecords: dayDiaper,
          pumpingRecords: dayPumping,
          medicineRecords: dayMedicine,
          growthRecords: dayGrowth,
          temperatureRecords: dayTemperature,
          activityRecords: dayActivity,
        });
      }

      return {
        weekStart,
        weekEnd,
        days,
      };
    }),

  /**
   * Get activities for list view (chronological, grouped by date)
   */
  getList: householdProcedure
    .input(getListTimelineSchema)
    .query(async ({ ctx, input }) => {
      const weekStart = startOfDay(input.weekStart);
      const weekEnd = endOfDay(addDays(weekStart, 6));

      // Fetch all activities for the week in parallel
      const [
        sleepRecords,
        feedingRecords,
        diaperRecords,
        pumpingRecords,
        medicineRecords,
        growthRecords,
        temperatureRecords,
        activityRecords,
      ] = await Promise.all([
        ctx.prisma.sleepRecord.findMany({
          where: {
            childId: input.childId,
            startTime: { gte: weekStart, lte: weekEnd },
          },
          orderBy: { startTime: "desc" },
        }),
        ctx.prisma.feedingRecord.findMany({
          where: {
            childId: input.childId,
            startTime: { gte: weekStart, lte: weekEnd },
          },
          orderBy: { startTime: "desc" },
        }),
        ctx.prisma.diaperRecord.findMany({
          where: {
            childId: input.childId,
            time: { gte: weekStart, lte: weekEnd },
          },
          orderBy: { time: "desc" },
        }),
        ctx.prisma.pumpingRecord.findMany({
          where: {
            childId: input.childId,
            startTime: { gte: weekStart, lte: weekEnd },
          },
          orderBy: { startTime: "desc" },
        }),
        ctx.prisma.medicineRecord.findMany({
          where: {
            medicine: { childId: input.childId },
            time: { gte: weekStart, lte: weekEnd },
          },
          include: { medicine: true },
          orderBy: { time: "desc" },
        }),
        ctx.prisma.growthRecord.findMany({
          where: {
            childId: input.childId,
            date: { gte: weekStart, lte: weekEnd },
          },
          orderBy: { date: "desc" },
        }),
        ctx.prisma.temperatureRecord.findMany({
          where: {
            childId: input.childId,
            time: { gte: weekStart, lte: weekEnd },
          },
          orderBy: { time: "desc" },
        }),
        ctx.prisma.activityRecord.findMany({
          where: {
            childId: input.childId,
            startTime: { gte: weekStart, lte: weekEnd },
          },
          orderBy: { startTime: "desc" },
        }),
      ]);

      // Combine and sort all activities chronologically
      type Activity =
        | { type: "SLEEP"; record: (typeof sleepRecords)[0]; time: Date }
        | { type: "FEEDING"; record: (typeof feedingRecords)[0]; time: Date }
        | { type: "DIAPER"; record: (typeof diaperRecords)[0]; time: Date }
        | { type: "PUMPING"; record: (typeof pumpingRecords)[0]; time: Date }
        | { type: "MEDICINE"; record: (typeof medicineRecords)[0]; time: Date }
        | { type: "GROWTH"; record: (typeof growthRecords)[0]; time: Date }
        | { type: "TEMPERATURE"; record: (typeof temperatureRecords)[0]; time: Date }
        | { type: "ACTIVITY"; record: (typeof activityRecords)[0]; time: Date };

      const allActivities: Activity[] = [
        ...sleepRecords.map(
          (r) => ({ type: "SLEEP" as const, record: r, time: r.startTime })
        ),
        ...feedingRecords.map(
          (r) => ({ type: "FEEDING" as const, record: r, time: r.startTime })
        ),
        ...diaperRecords.map(
          (r) => ({ type: "DIAPER" as const, record: r, time: r.time })
        ),
        ...pumpingRecords.map(
          (r) => ({ type: "PUMPING" as const, record: r, time: r.startTime })
        ),
        ...medicineRecords.map(
          (r) => ({ type: "MEDICINE" as const, record: r, time: r.time })
        ),
        ...growthRecords.map(
          (r) => ({ type: "GROWTH" as const, record: r, time: r.date })
        ),
        ...temperatureRecords.map(
          (r) => ({ type: "TEMPERATURE" as const, record: r, time: r.time })
        ),
        ...activityRecords.map(
          (r) => ({ type: "ACTIVITY" as const, record: r, time: r.startTime })
        ),
      ];

      // Sort by time descending (most recent first)
      allActivities.sort((a, b) => b.time.getTime() - a.time.getTime());

      // Group by date (using local date to ensure correct day grouping)
      const groupedByDate: Record<string, Activity[]> = {};
      for (const activity of allActivities) {
        // Use local date components to avoid timezone issues
        const d = new Date(activity.time);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(activity);
      }

      return {
        weekStart,
        weekEnd,
        activities: allActivities,
        groupedByDate,
      };
    }),
});
