import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createHouseholdSchema,
  updateHouseholdSchema,
  inviteMemberSchema,
  acceptInviteSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
} from "@finnberry/schemas";
import { createTRPCRouter, protectedProcedure, householdProcedure } from "../trpc";

export const householdRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.prisma.householdMember.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        household: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true },
                },
              },
            },
            children: {
              select: { id: true, name: true, birthDate: true, photo: true },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.household,
      role: m.role,
    }));
  }),

  get: householdProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const household = await ctx.prisma.household.findUnique({
        where: { id: input.id },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          children: true,
        },
      });

      if (!household) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return household;
    }),

  create: protectedProcedure
    .input(createHouseholdSchema)
    .mutation(async ({ ctx, input }) => {
      const household = await ctx.prisma.household.create({
        data: {
          name: input.name,
          members: {
            create: {
              userId: ctx.session.user.id,
              role: "OWNER",
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
      });

      return household;
    }),

  update: householdProcedure
    .input(updateHouseholdSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole !== "OWNER" && ctx.memberRole !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can update household settings",
        });
      }

      const household = await ctx.prisma.household.update({
        where: { id: input.id },
        data: { name: input.name },
      });

      return household;
    }),

  delete: householdProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can delete households",
        });
      }

      await ctx.prisma.household.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  invite: householdProcedure
    .input(inviteMemberSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole !== "OWNER" && ctx.memberRole !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can invite members",
        });
      }

      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        const existingMember = await ctx.prisma.householdMember.findUnique({
          where: {
            householdId_userId: {
              householdId: input.householdId,
              userId: existingUser.id,
            },
          },
        });

        if (existingMember) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User is already a member of this household",
          });
        }
      }

      const invite = await ctx.prisma.householdInvite.create({
        data: {
          householdId: input.householdId,
          email: input.email,
          role: input.role,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      return invite;
    }),

  acceptInvite: protectedProcedure
    .input(acceptInviteSchema)
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.prisma.householdInvite.findUnique({
        where: { token: input.token },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found",
        });
      }

      if (invite.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has expired",
        });
      }

      if (invite.email !== ctx.session.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invite is for a different email address",
        });
      }

      await ctx.prisma.$transaction([
        ctx.prisma.householdMember.create({
          data: {
            householdId: invite.householdId,
            userId: ctx.session.user.id,
            role: invite.role,
          },
        }),
        ctx.prisma.householdInvite.delete({
          where: { id: invite.id },
        }),
      ]);

      return { success: true, householdId: invite.householdId };
    }),

  updateMemberRole: householdProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.memberRole !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners can change member roles",
        });
      }

      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role",
        });
      }

      const member = await ctx.prisma.householdMember.update({
        where: {
          householdId_userId: {
            householdId: input.householdId,
            userId: input.userId,
          },
        },
        data: { role: input.role },
      });

      return member;
    }),

  removeMember: householdProcedure
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const isRemovingSelf = input.userId === ctx.session.user.id;

      if (!isRemovingSelf && ctx.memberRole !== "OWNER" && ctx.memberRole !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can remove members",
        });
      }

      const memberToRemove = await ctx.prisma.householdMember.findUnique({
        where: {
          householdId_userId: {
            householdId: input.householdId,
            userId: input.userId,
          },
        },
      });

      if (!memberToRemove) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (memberToRemove.role === "OWNER" && !isRemovingSelf) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove the owner",
        });
      }

      await ctx.prisma.householdMember.delete({
        where: {
          householdId_userId: {
            householdId: input.householdId,
            userId: input.userId,
          },
        },
      });

      return { success: true };
    }),
});
