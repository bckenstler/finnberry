import { TRPCError } from "@trpc/server";
import {
  startSleepSchema,
  endSleepSchema,
  logSleepSchema,
  updateSleepSchema,
  deleteSleepSchema,
  getSleepRecordsSchema,
  getActiveSleepSchema,
  sleepSummarySchema,
} from "@finnberry/schemas";
import { getDateRange, calculateDurationMinutes } from "@finnberry/utils";
import { createTRPCRouter, householdProcedure } from "../trpc";

export const sleepRouter = createTRPCRouter({
  list: householdProcedure
    .input(getSleepRecordsSchema)
    .query(async ({ ctx, input }) => {
      const dateFilter = input.dateRange
        ? { gte: input.dateRange.start, lte: input.dateRange.end }
        : input.period
          ? { gte: getDateRange(input.period).start, lte: getDateRange(input.period).end }
          : undefined;

      const records = await ctx.prisma.sleepRecord.findMany({
        where: {
          childId: input.childId,
          ...(dateFilter && { startTime: dateFilter }),
        },
        orderBy: { startTime: "desc" },
      });

      return records;
    }),

  getActive: householdProcedure
    .input(getActiveSleepSchema)
    .query(async ({ ctx, input }) => {
      const activeSleep = await ctx.prisma.sleepRecord.findFirst({
        where: {
          childId: input.childId,
          endTime: null,
        },
        orderBy: { startTime: "desc" },
      });

      return activeSleep;
    }),

  start: householdProcedure
    .input(startSleepSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const existingActive = await ctx.prisma.sleepRecord.findFirst({
        where: {
          childId: input.childId,
          endTime: null,
        },
      });

      if (existingActive) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "There is already an active sleep session",
        });
      }

      const sleep = await ctx.prisma.sleepRecord.create({
        data: {
          childId: input.childId,
          startTime: input.startTime ?? new Date(),
          sleepType: input.sleepType,
        },
      });

      return sleep;
    }),

  end: householdProcedure
    .input(endSleepSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const sleep = await ctx.prisma.sleepRecord.update({
        where: { id: input.id },
        data: {
          endTime: input.endTime ?? new Date(),
          quality: input.quality,
          notes: input.notes,
        },
      });

      return sleep;
    }),

  log: householdProcedure
    .input(logSleepSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const sleep = await ctx.prisma.sleepRecord.create({
        data: {
          childId: input.childId,
          startTime: input.startTime,
          endTime: input.endTime,
          sleepType: input.sleepType,
          quality: input.quality,
          notes: input.notes,
        },
      });

      return sleep;
    }),

  update: householdProcedure
    .input(updateSleepSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot update activities",
        });
      }

      const sleep = await ctx.prisma.sleepRecord.update({
        where: { id: input.id },
        data: {
          startTime: input.startTime,
          endTime: input.endTime,
          sleepType: input.sleepType,
          quality: input.quality,
          notes: input.notes,
        },
      });

      return sleep;
    }),

  delete: householdProcedure
    .input(deleteSleepSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot delete activities",
        });
      }

      await ctx.prisma.sleepRecord.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  summary: householdProcedure
    .input(sleepSummarySchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getDateRange(input.period);

      const records = await ctx.prisma.sleepRecord.findMany({
        where: {
          childId: input.childId,
          startTime: { gte: start, lte: end },
          endTime: { not: null },
        },
      });

      const totalMinutes = records.reduce((sum, r) => {
        if (!r.endTime) return sum;
        return sum + calculateDurationMinutes(r.startTime, r.endTime);
      }, 0);

      const napRecords = records.filter((r) => r.sleepType === "NAP");
      const nightRecords = records.filter((r) => r.sleepType === "NIGHT");

      const napMinutes = napRecords.reduce((sum, r) => {
        if (!r.endTime) return sum;
        return sum + calculateDurationMinutes(r.startTime, r.endTime);
      }, 0);

      const nightMinutes = nightRecords.reduce((sum, r) => {
        if (!r.endTime) return sum;
        return sum + calculateDurationMinutes(r.startTime, r.endTime);
      }, 0);

      const avgQuality = records.filter((r) => r.quality).length > 0
        ? records.reduce((sum, r) => sum + (r.quality ?? 0), 0) /
          records.filter((r) => r.quality).length
        : null;

      return {
        totalSessions: records.length,
        totalMinutes,
        napCount: napRecords.length,
        napMinutes,
        nightCount: nightRecords.length,
        nightMinutes,
        averageQuality: avgQuality,
      };
    }),
});
