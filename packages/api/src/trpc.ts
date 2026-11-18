import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod";
import { prisma, type PrismaClient } from "@finnberry/db";
import { idSchema } from "@finnberry/schemas";

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

const viaChild = { child: { select: { householdId: true } } } as const;

// Maps each kind of resource a procedure can target to the household that
// owns it. A resolver returns undefined when the resource does not exist.
const householdIdResolvers = {
  household: async (_prisma, id) => id,
  child: async (prisma, id) =>
    (await prisma.child.findUnique({ where: { id }, select: { householdId: true } }))
      ?.householdId,
  sleepRecord: async (prisma, id) =>
    (await prisma.sleepRecord.findUnique({ where: { id }, select: viaChild }))?.child
      .householdId,
  feedingRecord: async (prisma, id) =>
    (await prisma.feedingRecord.findUnique({ where: { id }, select: viaChild }))?.child
      .householdId,
  diaperRecord: async (prisma, id) =>
    (await prisma.diaperRecord.findUnique({ where: { id }, select: viaChild }))?.child
      .householdId,
  pumpingRecord: async (prisma, id) =>
    (await prisma.pumpingRecord.findUnique({ where: { id }, select: viaChild }))?.child
      .householdId,
  growthRecord: async (prisma, id) =>
    (await prisma.growthRecord.findUnique({ where: { id }, select: viaChild }))?.child
      .householdId,
  activityRecord: async (prisma, id) =>
    (await prisma.activityRecord.findUnique({ where: { id }, select: viaChild }))?.child
      .householdId,
  temperatureRecord: async (prisma, id) =>
    (await prisma.temperatureRecord.findUnique({ where: { id }, select: viaChild }))
      ?.child.householdId,
  medicine: async (prisma, id) =>
    (await prisma.medicine.findUnique({ where: { id }, select: viaChild }))?.child
      .householdId,
  medicineRecord: async (prisma, id) =>
    (
      await prisma.medicineRecord.findUnique({
        where: { id },
        select: { medicine: { select: viaChild } },
      })
    )?.medicine.child.householdId,
} satisfies Record<
  string,
  (prisma: TRPCContext["prisma"], id: string) => Promise<string | undefined>
>;

export type HouseholdScope = keyof typeof householdIdResolvers;

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

async function authorizeHouseholdAccess(
  ctx: { prisma: TRPCContext["prisma"]; session: { user: { id: string } } },
  scope: HouseholdScope,
  resourceId: string
) {
  const householdId = await householdIdResolvers[scope](ctx.prisma, resourceId);
  if (!householdId) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  const membership = await validateHouseholdAccess(
    ctx.prisma,
    householdId,
    ctx.session.user.id
  );

  return { householdId, memberRole: membership.role };
}

// Each household-scoped procedure authorizes on exactly one validated input
// key, the same key its handler acts on. A router adds the rest of its input
// with a second .input(), which tRPC merges with this one. Authorizing on the
// raw input instead would let a caller name one household to be checked and a
// different resource to be acted on.
export const householdProcedure = protectedProcedure
  .input(z.object({ householdId: idSchema }))
  .use(async ({ ctx, input, next }) =>
    next({ ctx: await authorizeHouseholdAccess(ctx, "household", input.householdId) })
  );

export const childProcedure = protectedProcedure
  .input(z.object({ childId: idSchema }))
  .use(async ({ ctx, input, next }) =>
    next({ ctx: await authorizeHouseholdAccess(ctx, "child", input.childId) })
  );

export const medicineProcedure = protectedProcedure
  .input(z.object({ medicineId: idSchema }))
  .use(async ({ ctx, input, next }) =>
    next({ ctx: await authorizeHouseholdAccess(ctx, "medicine", input.medicineId) })
  );

// For procedures whose `id` names the resource itself; the caller declares
// which kind of resource that is.
export const byIdProcedure = (scope: HouseholdScope) =>
  protectedProcedure
    .input(z.object({ id: idSchema }))
    .use(async ({ ctx, input, next }) =>
      next({ ctx: await authorizeHouseholdAccess(ctx, scope, input.id) })
    );
