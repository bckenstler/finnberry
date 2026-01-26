import { TRPCError } from "@trpc/server";
import { updateUserSchema, deleteUserSchema } from "@finnberry/schemas";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return user;
  }),

  update: protectedProcedure
    .input(updateUserSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { name: input.name },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });

      return user;
    }),

  delete: protectedProcedure
    .input(deleteUserSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify email matches as confirmation
      if (input.confirmEmail !== ctx.session.user.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email confirmation does not match your account email",
        });
      }

      // Check for households where user is the sole owner
      const ownedHouseholds = await ctx.prisma.householdMember.findMany({
        where: {
          userId: ctx.session.user.id,
          role: "OWNER",
        },
        include: {
          household: {
            include: {
              members: true,
            },
          },
        },
      });

      // For each household where user is owner, handle ownership transfer or deletion
      for (const membership of ownedHouseholds) {
        const otherMembers = membership.household.members.filter(
          (m) => m.userId !== ctx.session.user.id
        );

        if (otherMembers.length === 0) {
          // No other members, delete the household (cascades to children and records)
          await ctx.prisma.household.delete({
            where: { id: membership.householdId },
          });
        } else {
          // Transfer ownership to first admin, or first member if no admins
          const newOwner =
            otherMembers.find((m) => m.role === "ADMIN") || otherMembers[0];

          await ctx.prisma.householdMember.update({
            where: {
              householdId_userId: {
                householdId: membership.householdId,
                userId: newOwner.userId,
              },
            },
            data: { role: "OWNER" },
          });
        }
      }

      // Delete user (cascades to sessions, accounts, remaining memberships)
      await ctx.prisma.user.delete({
        where: { id: ctx.session.user.id },
      });

      return { success: true };
    }),
});
