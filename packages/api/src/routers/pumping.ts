import { TRPCError } from "@trpc/server";
import {
  startPumpingSchema,
  endPumpingSchema,
  logPumpingSchema,
  updatePumpingSchema,
  deletePumpingSchema,
  getPumpingRecordsSchema,
  pumpingSummarySchema,
  getActivePumpingSchema,
} from "@finnberry/schemas";
import { getDateRange, calculateDurationMinutes } from "@finnberry/utils";
import { createTRPCRouter, householdProcedure } from "../trpc";

export const pumpingRouter = createTRPCRouter({
  list: householdProcedure
    .input(getPumpingRecordsSchema)
    .query(async ({ ctx, input }) => {
      const dateFilter = input.dateRange
        ? { gte: input.dateRange.start, lte: input.dateRange.end }
        : input.period
          ? { gte: getDateRange(input.period).start, lte: getDateRange(input.period).end }
          : undefined;

      const records = await ctx.prisma.pumpingRecord.findMany({
        where: {
          childId: input.childId,
          ...(dateFilter && { startTime: dateFilter }),
        },
        orderBy: { startTime: "desc" },
      });

      return records;
    }),

  start: householdProcedure
    .input(startPumpingSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const pumping = await ctx.prisma.pumpingRecord.create({
        data: {
          childId: input.childId,
          startTime: input.startTime ?? new Date(),
          side: input.side,
        },
      });

      return pumping;
    }),

  end: householdProcedure
    .input(endPumpingSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const pumping = await ctx.prisma.pumpingRecord.update({
        where: { id: input.id },
        data: {
          endTime: input.endTime ?? new Date(),
          amountMl: input.amountMl,
          notes: input.notes,
        },
      });

      return pumping;
    }),

  log: householdProcedure
    .input(logPumpingSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const pumping = await ctx.prisma.pumpingRecord.create({
        data: {
          childId: input.childId,
          startTime: input.startTime,
          endTime: input.endTime,
          amountMl: input.amountMl,
          side: input.side,
          notes: input.notes,
        },
      });

      return pumping;
    }),

  update: householdProcedure
    .input(updatePumpingSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot update activities",
        });
      }

      const pumping = await ctx.prisma.pumpingRecord.update({
        where: { id: input.id },
        data: {
          startTime: input.startTime,
          endTime: input.endTime,
          amountMl: input.amountMl,
          side: input.side,
          notes: input.notes,
        },
      });

      return pumping;
    }),

  delete: householdProcedure
    .input(deletePumpingSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot delete activities",
        });
      }

      await ctx.prisma.pumpingRecord.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  summary: householdProcedure
    .input(pumpingSummarySchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getDateRange(input.period);

      const records = await ctx.prisma.pumpingRecord.findMany({
        where: {
          childId: input.childId,
          startTime: { gte: start, lte: end },
        },
      });

      const totalMinutes = records.reduce((sum, r) => {
        if (!r.endTime) return sum;
        return sum + calculateDurationMinutes(r.startTime, r.endTime);
      }, 0);

      const totalMl = records.reduce((sum, r) => sum + (r.amountMl ?? 0), 0);

      return {
        totalSessions: records.length,
        totalMinutes,
        totalMl,
        averageMl: records.length > 0 ? totalMl / records.length : 0,
      };
    }),

  getActive: householdProcedure
    .input(getActivePumpingSchema)
    .query(async ({ ctx, input }) => {
      // Find active pumping session (no end time)
      const activePumping = await ctx.prisma.pumpingRecord.findFirst({
        where: {
          childId: input.childId,
          endTime: null,
        },
        orderBy: { startTime: "desc" },
      });

      return activePumping;
    }),
});
