import { TRPCError } from "@trpc/server";
import { setUserStatusSchema } from "@finnberry/schemas";
import { createTRPCRouter, adminProcedure } from "../trpc";

export const adminRouter = createTRPCRouter({
  listUsers: adminProcedure.query(({ ctx }) =>
    ctx.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        status: true,
        isAdmin: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })
  ),

  setUserStatus: adminProcedure
    .input(setUserStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { isAdmin: true },
      });

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // There is one admin, so this also stops the admin locking themself out.
      if (target.isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "The admin account's access cannot be changed",
        });
      }

      const updateStatus = ctx.prisma.user.update({
        where: { id: input.userId },
        data: { status: input.status },
        select: { id: true, status: true },
      });

      if (input.status === "APPROVED") {
        return updateStatus;
      }

      const [user] = await ctx.prisma.$transaction([
        updateStatus,
        ctx.prisma.session.deleteMany({ where: { userId: input.userId } }),
      ]);
      return user;
    }),
});
