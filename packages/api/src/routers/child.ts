import { TRPCError } from "@trpc/server";
import {
  createChildSchema,
  updateChildSchema,
  deleteChildSchema,
  getChildSchema,
  listChildrenSchema,
} from "@finnberry/schemas";
import { createTRPCRouter, householdProcedure } from "../trpc";

export const childRouter = createTRPCRouter({
  list: householdProcedure
    .input(listChildrenSchema)
    .query(async ({ ctx, input }) => {
      const children = await ctx.prisma.child.findMany({
        where: { householdId: input.householdId },
        orderBy: { birthDate: "desc" },
      });

      return children;
    }),

  get: householdProcedure
    .input(getChildSchema)
    .query(async ({ ctx, input }) => {
      const child = await ctx.prisma.child.findUnique({
        where: { id: input.id },
        include: {
          household: {
            select: { id: true, name: true },
          },
        },
      });

      if (!child) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return child;
    }),

  create: householdProcedure
    .input(createChildSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot add children",
        });
      }

      const child = await ctx.prisma.child.create({
        data: {
          householdId: input.householdId,
          name: input.name,
          birthDate: input.birthDate,
          gender: input.gender,
          photo: input.photo,
        },
      });

      return child;
    }),

  update: householdProcedure
    .input(updateChildSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot update children",
        });
      }

      const child = await ctx.prisma.child.update({
        where: { id: input.id },
        data: {
          name: input.name,
          birthDate: input.birthDate,
          gender: input.gender,
          photo: input.photo,
        },
      });

      return child;
    }),

  delete: householdProcedure
    .input(deleteChildSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole !== "OWNER" && ctx.memberRole !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can delete children",
        });
      }

      await ctx.prisma.child.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
