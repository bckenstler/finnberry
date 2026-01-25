import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { prisma, type PrismaClient } from "@finnberry/db";

export type TRPCContext = {
  prisma: PrismaClient;
  session: {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  } | null;
  headers: Headers;
};

export const createTRPCContext = async (opts: {
  headers: Headers;
  session?: TRPCContext["session"];
}): Promise<TRPCContext> => {
  return {
    prisma,
    session: opts.session ?? null,
    headers: opts.headers,
  };
};

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  if (duration > 1000) {
    console.log(`[TRPC] ${path} took ${duration}ms`);
  }

  return result;
});

export const publicProcedure = t.procedure.use(timingMiddleware);

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(enforceUserIsAuthed);

const enforceHouseholdAccess = t.middleware(async ({ ctx, next, rawInput }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const input = rawInput as { householdId?: string; childId?: string };
  let householdId = input.householdId;

  if (!householdId && input.childId) {
    const child = await ctx.prisma.child.findUnique({
      where: { id: input.childId },
      select: { householdId: true },
    });
    householdId = child?.householdId;
  }

  if (householdId) {
    const membership = await ctx.prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId,
          userId: ctx.session.user.id,
        },
      },
    });

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this household",
      });
    }

    return next({
      ctx: {
        ...ctx,
        householdId,
        memberRole: membership.role,
      },
    });
  }

  return next({ ctx });
});

export const householdProcedure = protectedProcedure.use(enforceHouseholdAccess);
