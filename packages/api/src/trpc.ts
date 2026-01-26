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

// Helper to extract household ID from various input formats
async function resolveHouseholdId(
  prisma: TRPCContext["prisma"],
  input: { householdId?: string; childId?: string; id?: string }
): Promise<string | undefined> {
  // Direct householdId takes priority
  if (input.householdId) {
    return input.householdId;
  }

  // Check for childId first (explicit child reference)
  if (input.childId) {
    const child = await prisma.child.findUnique({
      where: { id: input.childId },
      select: { householdId: true },
    });
    if (child?.householdId) {
      return child.householdId;
    }
  }

  // For 'id' field, try as child first, then as household
  if (input.id) {
    // Try as child ID
    const child = await prisma.child.findUnique({
      where: { id: input.id },
      select: { householdId: true },
    });
    if (child?.householdId) {
      return child.householdId;
    }

    // Try as household ID directly (for routes like household.update)
    const household = await prisma.household.findUnique({
      where: { id: input.id },
      select: { id: true },
    });
    if (household) {
      return household.id;
    }
  }

  return undefined;
}

// Helper to get membership and validate access
async function validateHouseholdAccess(
  prisma: TRPCContext["prisma"],
  householdId: string,
  userId: string
) {
  const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this household",
    });
  }

  return membership;
}

// Create a procedure that validates household access using input
// This approach works with tRPC v11's caller factory for testing
export const householdProcedure = protectedProcedure.use(
  async ({ ctx, next, getRawInput }) => {
    const rawInput = await getRawInput();
    const input = (rawInput ?? {}) as { householdId?: string; childId?: string; id?: string };

    const householdId = await resolveHouseholdId(ctx.prisma, input);

    if (householdId) {
      const membership = await validateHouseholdAccess(
        ctx.prisma,
        householdId,
        ctx.session.user.id
      );

      return next({
        ctx: {
          ...ctx,
          householdId,
          memberRole: membership.role,
        },
      });
    }

    return next({ ctx });
  }
);
