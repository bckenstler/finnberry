import { TRPCError } from "@trpc/server";
import {
  startActivitySchema,
  endActivitySchema,
  logActivitySchema,
  updateActivitySchema,
  deleteActivitySchema,
  getActivityRecordsSchema,
  activitySummarySchema,
} from "@finnberry/schemas";
import { getDateRange, calculateDurationMinutes } from "@finnberry/utils";
import { createTRPCRouter, householdProcedure } from "../trpc";

export const activityRouter = createTRPCRouter({
  list: householdProcedure
    .input(getActivityRecordsSchema)
    .query(async ({ ctx, input }) => {
      const dateFilter = input.dateRange
        ? { gte: input.dateRange.start, lte: input.dateRange.end }
        : input.period
          ? { gte: getDateRange(input.period).start, lte: getDateRange(input.period).end }
          : undefined;

      const records = await ctx.prisma.activityRecord.findMany({
        where: {
          childId: input.childId,
          ...(input.activityType && { activityType: input.activityType }),
          ...(dateFilter && { startTime: dateFilter }),
        },
        orderBy: { startTime: "desc" },
      });

      return records;
    }),

  start: householdProcedure
    .input(startActivitySchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const activity = await ctx.prisma.activityRecord.create({
        data: {
          childId: input.childId,
          activityType: input.activityType,
          startTime: input.startTime ?? new Date(),
        },
      });

      return activity;
    }),

  end: householdProcedure
    .input(endActivitySchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const activity = await ctx.prisma.activityRecord.update({
        where: { id: input.id },
        data: {
          endTime: input.endTime ?? new Date(),
          notes: input.notes,
        },
      });

      return activity;
    }),

  log: householdProcedure
    .input(logActivitySchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const activity = await ctx.prisma.activityRecord.create({
        data: {
          childId: input.childId,
          activityType: input.activityType,
          startTime: input.startTime,
          endTime: input.endTime,
          notes: input.notes,
        },
      });

      return activity;
    }),

  update: householdProcedure
    .input(updateActivitySchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot update activities",
        });
      }

      const activity = await ctx.prisma.activityRecord.update({
        where: { id: input.id },
        data: {
          activityType: input.activityType,
          startTime: input.startTime,
          endTime: input.endTime,
          notes: input.notes,
        },
      });

      return activity;
    }),

  delete: householdProcedure
    .input(deleteActivitySchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot delete activities",
        });
      }

      await ctx.prisma.activityRecord.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  summary: householdProcedure
    .input(activitySummarySchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getDateRange(input.period);

      const records = await ctx.prisma.activityRecord.findMany({
        where: {
          childId: input.childId,
          startTime: { gte: start, lte: end },
        },
      });

      const byType = records.reduce(
        (acc, r) => {
          if (!acc[r.activityType]) {
            acc[r.activityType] = { count: 0, totalMinutes: 0 };
          }
          acc[r.activityType].count++;
          if (r.endTime) {
            acc[r.activityType].totalMinutes += calculateDurationMinutes(
              r.startTime,
              r.endTime
            );
          }
          return acc;
        },
        {} as Record<string, { count: number; totalMinutes: number }>
      );

      return {
        totalActivities: records.length,
        byType,
      };
    }),
});
