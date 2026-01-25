import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createMedicineSchema,
  updateMedicineSchema,
  deleteMedicineSchema,
  getMedicinesSchema,
  logMedicineRecordSchema,
  updateMedicineRecordSchema,
  deleteMedicineRecordSchema,
  getMedicineRecordsSchema,
} from "@finnberry/schemas";
import { createTRPCRouter, householdProcedure } from "../trpc";

export const medicineRouter = createTRPCRouter({
  list: householdProcedure
    .input(getMedicinesSchema)
    .query(async ({ ctx, input }) => {
      const medicines = await ctx.prisma.medicine.findMany({
        where: {
          childId: input.childId,
          ...(input.activeOnly && { isActive: true }),
        },
        orderBy: { name: "asc" },
      });

      return medicines;
    }),

  get: householdProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const medicine = await ctx.prisma.medicine.findUnique({
        where: { id: input.id },
        include: {
          records: {
            orderBy: { time: "desc" },
            take: 10,
          },
        },
      });

      if (!medicine) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return medicine;
    }),

  create: householdProcedure
    .input(createMedicineSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot add medicines",
        });
      }

      const medicine = await ctx.prisma.medicine.create({
        data: {
          childId: input.childId,
          name: input.name,
          dosage: input.dosage,
          frequency: input.frequency,
          notes: input.notes,
        },
      });

      return medicine;
    }),

  update: householdProcedure
    .input(updateMedicineSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot update medicines",
        });
      }

      const medicine = await ctx.prisma.medicine.update({
        where: { id: input.id },
        data: {
          name: input.name,
          dosage: input.dosage,
          frequency: input.frequency,
          notes: input.notes,
          isActive: input.isActive,
        },
      });

      return medicine;
    }),

  delete: householdProcedure
    .input(deleteMedicineSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole !== "OWNER" && ctx.memberRole !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can delete medicines",
        });
      }

      await ctx.prisma.medicine.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  logRecord: householdProcedure
    .input(logMedicineRecordSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot log medicine records",
        });
      }

      const record = await ctx.prisma.medicineRecord.create({
        data: {
          medicineId: input.medicineId,
          time: input.time ?? new Date(),
          dosageGiven: input.dosageGiven,
          skipped: input.skipped,
          notes: input.notes,
        },
      });

      return record;
    }),

  updateRecord: householdProcedure
    .input(updateMedicineRecordSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot update medicine records",
        });
      }

      const record = await ctx.prisma.medicineRecord.update({
        where: { id: input.id },
        data: {
          time: input.time,
          dosageGiven: input.dosageGiven,
          skipped: input.skipped,
          notes: input.notes,
        },
      });

      return record;
    }),

  deleteRecord: householdProcedure
    .input(deleteMedicineRecordSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot delete medicine records",
        });
      }

      await ctx.prisma.medicineRecord.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  getRecords: householdProcedure
    .input(getMedicineRecordsSchema)
    .query(async ({ ctx, input }) => {
      const records = await ctx.prisma.medicineRecord.findMany({
        where: {
          medicineId: input.medicineId,
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
});
