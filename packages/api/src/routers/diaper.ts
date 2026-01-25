import { TRPCError } from "@trpc/server";
import {
  logDiaperSchema,
  updateDiaperSchema,
  deleteDiaperSchema,
  getDiaperRecordsSchema,
  diaperSummarySchema,
} from "@finnberry/schemas";
import { getDateRange } from "@finnberry/utils";
import { createTRPCRouter, householdProcedure } from "../trpc";

export const diaperRouter = createTRPCRouter({
  list: householdProcedure
    .input(getDiaperRecordsSchema)
    .query(async ({ ctx, input }) => {
      const dateFilter = input.dateRange
        ? { gte: input.dateRange.start, lte: input.dateRange.end }
        : input.period
          ? { gte: getDateRange(input.period).start, lte: getDateRange(input.period).end }
          : undefined;

      const records = await ctx.prisma.diaperRecord.findMany({
        where: {
          childId: input.childId,
          ...(input.diaperType && { diaperType: input.diaperType }),
          ...(dateFilter && { time: dateFilter }),
        },
        orderBy: { time: "desc" },
      });

      return records;
    }),

  log: householdProcedure
    .input(logDiaperSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const diaper = await ctx.prisma.diaperRecord.create({
        data: {
          childId: input.childId,
          time: input.time ?? new Date(),
          diaperType: input.diaperType,
          color: input.color,
          consistency: input.consistency,
          notes: input.notes,
        },
      });

      return diaper;
    }),

  update: householdProcedure
    .input(updateDiaperSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot update activities",
        });
      }

      const diaper = await ctx.prisma.diaperRecord.update({
        where: { id: input.id },
        data: {
          time: input.time,
          diaperType: input.diaperType,
          color: input.color,
          consistency: input.consistency,
          notes: input.notes,
        },
      });

      return diaper;
    }),

  delete: householdProcedure
    .input(deleteDiaperSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot delete activities",
        });
      }

      await ctx.prisma.diaperRecord.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  summary: householdProcedure
    .input(diaperSummarySchema)
    .query(async ({ ctx, input }) => {
      const { start, end } = getDateRange(input.period);

      const records = await ctx.prisma.diaperRecord.findMany({
        where: {
          childId: input.childId,
          time: { gte: start, lte: end },
        },
      });

      const wetCount = records.filter(
        (r) => r.diaperType === "WET" || r.diaperType === "BOTH"
      ).length;
      const dirtyCount = records.filter(
        (r) => r.diaperType === "DIRTY" || r.diaperType === "BOTH"
      ).length;
      const dryCount = records.filter((r) => r.diaperType === "DRY").length;

      const lastDiaper = records.sort(
        (a, b) => b.time.getTime() - a.time.getTime()
      )[0];

      return {
        totalChanges: records.length,
        wetCount,
        dirtyCount,
        dryCount,
        lastChange: lastDiaper?.time ?? null,
        lastType: lastDiaper?.diaperType ?? null,
      };
    }),
});
