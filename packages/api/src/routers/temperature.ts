import { TRPCError } from "@trpc/server";
import {
  logTemperatureSchema,
  updateTemperatureSchema,
  deleteTemperatureSchema,
  getTemperatureRecordsSchema,
  getLatestTemperatureSchema,
} from "@finnberry/schemas";
import { createTRPCRouter, householdProcedure } from "../trpc";

export const temperatureRouter = createTRPCRouter({
  list: householdProcedure
    .input(getTemperatureRecordsSchema)
    .query(async ({ ctx, input }) => {
      const records = await ctx.prisma.temperatureRecord.findMany({
        where: {
          childId: input.childId,
          ...(input.dateRange && {
            time: {
              gte: input.dateRange.start,
              lte: input.dateRange.end,
            },
          }),
        },
        orderBy: { time: "desc" },
      });

      return records;
    }),

  getLatest: householdProcedure
    .input(getLatestTemperatureSchema)
    .query(async ({ ctx, input }) => {
      const latest = await ctx.prisma.temperatureRecord.findFirst({
        where: { childId: input.childId },
        orderBy: { time: "desc" },
      });

      return latest;
    }),

  log: householdProcedure
    .input(logTemperatureSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log activities",
        });
      }

      const temperature = await ctx.prisma.temperatureRecord.create({
        data: {
          childId: input.childId,
          time: input.time,
          temperatureCelsius: input.temperatureCelsius,
          notes: input.notes,
        },
      });

      return temperature;
    }),

  update: householdProcedure
    .input(updateTemperatureSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot update activities",
        });
      }

      const temperature = await ctx.prisma.temperatureRecord.update({
        where: { id: input.id },
        data: {
          time: input.time,
          temperatureCelsius: input.temperatureCelsius,
          notes: input.notes,
        },
      });

      return temperature;
    }),

  delete: householdProcedure
    .input(deleteTemperatureSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot delete activities",
        });
      }

      await ctx.prisma.temperatureRecord.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
