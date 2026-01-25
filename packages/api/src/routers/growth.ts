import { TRPCError } from "@trpc/server";
import {
  logGrowthSchema,
  updateGrowthSchema,
  deleteGrowthSchema,
  getGrowthRecordsSchema,
  getLatestGrowthSchema,
} from "@finnberry/schemas";
import { createTRPCRouter, householdProcedure } from "../trpc";

export const growthRouter = createTRPCRouter({
  list: householdProcedure
    .input(getGrowthRecordsSchema)
    .query(async ({ ctx, input }) => {
      const records = await ctx.prisma.growthRecord.findMany({
        where: {
          childId: input.childId,
          ...(input.dateRange && {
            date: {
              gte: input.dateRange.start,
              lte: input.dateRange.end,
            },
          }),
        },
        orderBy: { date: "desc" },
      });

      return records;
    }),

  getLatest: householdProcedure
    .input(getLatestGrowthSchema)
    .query(async ({ ctx, input }) => {
      const latest = await ctx.prisma.growthRecord.findFirst({
        where: { childId: input.childId },
        orderBy: { date: "desc" },
      });

      return latest;
    }),

  log: householdProcedure
    .input(logGrowthSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const growth = await ctx.prisma.growthRecord.create({
        data: {
          childId: input.childId,
          date: input.date,
          weightKg: input.weightKg,
          heightCm: input.heightCm,
          headCircumferenceCm: input.headCircumferenceCm,
          notes: input.notes,
        },
      });

      return growth;
    }),

  update: householdProcedure
    .input(updateGrowthSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot update activities",
        });
      }

      const growth = await ctx.prisma.growthRecord.update({
        where: { id: input.id },
        data: {
          date: input.date,
          weightKg: input.weightKg,
          heightCm: input.heightCm,
          headCircumferenceCm: input.headCircumferenceCm,
          notes: input.notes,
        },
      });

      return growth;
    }),

  delete: householdProcedure
    .input(deleteGrowthSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot delete activities",
        });
      }

      await ctx.prisma.growthRecord.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
