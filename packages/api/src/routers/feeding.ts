import { TRPCError } from "@trpc/server";
import {
  logBreastfeedingSchema,
  startBreastfeedingSchema,
  endBreastfeedingSchema,
  switchBreastfeedingSideSchema,
  logBottleSchema,
  logSolidsSchema,
  updateFeedingSchema,
  deleteFeedingSchema,
  getFeedingRecordsSchema,
  getActiveFeedingSchema,
  feedingSummarySchema,
} from "@finnberry/schemas";
import { getDateRange, calculateDurationMinutes } from "@finnberry/utils";
import { createTRPCRouter, byIdProcedure, childProcedure } from "../trpc";

export const feedingRouter = createTRPCRouter({
  list: childProcedure
    .input(getFeedingRecordsSchema)
    .query(async ({ ctx, input }) => {
      const dateFilter = input.dateRange
        ? { gte: input.dateRange.start, lte: input.dateRange.end }
        : input.period
          ? { gte: getDateRange(input.period).start, lte: getDateRange(input.period).end }
          : undefined;

      const records = await ctx.prisma.feedingRecord.findMany({
        where: {
          childId: input.childId,
          ...(input.feedingType && { feedingType: input.feedingType }),
          ...(dateFilter && { startTime: dateFilter }),
        },
        orderBy: { startTime: "desc" },
      });

      return records;
    }),

  getActive: childProcedure
    .input(getActiveFeedingSchema)
    .query(async ({ ctx, input }) => {
      const activeFeeding = await ctx.prisma.feedingRecord.findFirst({
        where: {
          childId: input.childId,
          feedingType: "BREAST",
          endTime: null,
        },
        orderBy: { startTime: "desc" },
      });

      return activeFeeding;
    }),

  startBreastfeeding: childProcedure
    .input(startBreastfeedingSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const existingActive = await ctx.prisma.feedingRecord.findFirst({
        where: {
          childId: input.childId,
          feedingType: "BREAST",
          endTime: null,
        },
      });

      if (existingActive) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "There is already an active feeding session",
        });
      }

      const feeding = await ctx.prisma.feedingRecord.create({
        data: {
          childId: input.childId,
          feedingType: "BREAST",
          startTime: input.startTime ?? new Date(),
          side: input.side,
        },
      });

      return feeding;
    }),

  endBreastfeeding: byIdProcedure("feedingRecord")
    .input(endBreastfeedingSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const feeding = await ctx.prisma.feedingRecord.update({
        where: { id: input.id },
        data: {
          endTime: input.endTime ?? new Date(),
          side: input.side,
          leftDurationSeconds: input.leftDurationSeconds,
          rightDurationSeconds: input.rightDurationSeconds,
          notes: input.notes,
        },
      });

      return feeding;
    }),

  switchBreastfeedingSide: byIdProcedure("feedingRecord")
    .input(switchBreastfeedingSideSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const feeding = await ctx.prisma.feedingRecord.update({
        where: { id: input.id },
        data: {
          side: input.newSide,
          leftDurationSeconds: input.leftDurationSeconds,
          rightDurationSeconds: input.rightDurationSeconds,
        },
      });

      return feeding;
    }),

  logBreastfeeding: childProcedure
    .input(logBreastfeedingSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const feeding = await ctx.prisma.feedingRecord.create({
        data: {
          childId: input.childId,
          feedingType: "BREAST",
          startTime: input.startTime,
          endTime: input.endTime,
          side: input.side,
          leftDurationSeconds: input.leftDurationSeconds,
          rightDurationSeconds: input.rightDurationSeconds,
          notes: input.notes,
        },
      });

      return feeding;
    }),

  logBottle: childProcedure
    .input(logBottleSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const feeding = await ctx.prisma.feedingRecord.create({
        data: {
          childId: input.childId,
          feedingType: "BOTTLE",
          startTime: input.startTime,
          endTime: input.endTime,
          amountMl: input.amountMl,
          bottleContentType: input.bottleContentType,
          notes: input.notes,
        },
      });

      return feeding;
    }),

  logSolids: childProcedure
    .input(logSolidsSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const feeding = await ctx.prisma.feedingRecord.create({
        data: {
          childId: input.childId,
          feedingType: "SOLIDS",
          startTime: input.startTime,
          endTime: input.endTime,
          foodItems: input.foodItems,
          notes: input.notes,
        },
      });

      return feeding;
    }),

  update: byIdProcedure("feedingRecord")
    .input(updateFeedingSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot update activities",
        });
      }

      const feeding = await ctx.prisma.feedingRecord.update({
        where: { id: input.id },
        data: {
          startTime: input.startTime,
          endTime: input.endTime,
          side: input.side,
          leftDurationSeconds: input.leftDurationSeconds,
          rightDurationSeconds: input.rightDurationSeconds,
          amountMl: input.amountMl,
          bottleContentType: input.bottleContentType,
          foodItems: input.foodItems,
          notes: input.notes,
        },
      });

      return feeding;
    }),

  delete: byIdProcedure("feedingRecord")
    .input(deleteFeedingSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot delete activities",
        });
      }

      await ctx.prisma.feedingRecord.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  summary: childProcedure
    .input(feedingSummarySchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getDateRange(input.period);

      const records = await ctx.prisma.feedingRecord.findMany({
        where: {
          childId: input.childId,
          startTime: { gte: start, lte: end },
        },
      });

      const breastRecords = records.filter((r) => r.feedingType === "BREAST");
      const bottleRecords = records.filter((r) => r.feedingType === "BOTTLE");
      const solidsRecords = records.filter((r) => r.feedingType === "SOLIDS");

      const breastMinutes = breastRecords.reduce((sum, r) => {
        if (!r.endTime) return sum;
        return sum + calculateDurationMinutes(r.startTime, r.endTime);
      }, 0);

      const totalBottleMl = bottleRecords.reduce(
        (sum, r) => sum + (r.amountMl ?? 0),
        0
      );

      const lastLeftSide = breastRecords
        .filter((r) => r.side === "LEFT" || r.side === "BOTH")
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];

      const lastRightSide = breastRecords
        .filter((r) => r.side === "RIGHT" || r.side === "BOTH")
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];

      return {
        totalFeedings: records.length,
        breastfeedingCount: breastRecords.length,
        breastfeedingMinutes: breastMinutes,
        bottleCount: bottleRecords.length,
        totalBottleMl,
        solidsCount: solidsRecords.length,
        lastLeftSide: lastLeftSide?.startTime ?? null,
        lastRightSide: lastRightSide?.startTime ?? null,
      };
    }),
});
