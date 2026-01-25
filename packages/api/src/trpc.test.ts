import { describe, it, expect, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { prismaMock } from "./test/setup";
import {
  createTestContext,
  createUnauthenticatedContext,
  createTestMembership,
  createTestChild,
  TEST_IDS,
} from "./test/helpers";
import { createCallerFactory, createTRPCRouter, protectedProcedure, householdProcedure } from "./trpc";
import { z } from "zod";
import { idSchema } from "@finnberry/schemas";

// Create test routers for middleware testing
const testRouter = createTRPCRouter({
  protectedTest: protectedProcedure.query(() => {
    return { success: true };
  }),
  householdTest: householdProcedure
    .input(z.object({ householdId: idSchema }))
    .query(({ ctx }) => {
      return { householdId: ctx.householdId, role: ctx.memberRole };
    }),
  householdByChildTest: householdProcedure
    .input(z.object({ childId: idSchema }))
    .query(({ ctx }) => {
      return { householdId: ctx.householdId, role: ctx.memberRole };
    }),
  householdByIdTest: householdProcedure
    .input(z.object({ id: idSchema }))
    .query(({ ctx }) => {
      return { householdId: ctx.householdId, role: ctx.memberRole };
    }),
});

const createCaller = createCallerFactory(testRouter);

describe("protectedProcedure middleware", () => {
  it("throws UNAUTHORIZED when no session", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = createCaller(ctx);

    await expect(caller.protectedTest()).rejects.toThrow(TRPCError);
    await expect(caller.protectedTest()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("allows access with valid session", async () => {
    const ctx = createTestContext();
    const caller = createCaller(ctx);

    const result = await caller.protectedTest();
    expect(result).toEqual({ success: true });
  });
});

describe("householdProcedure middleware", () => {
  beforeEach(() => {
    prismaMock.householdMember.findUnique.mockResolvedValue(null);
    prismaMock.child.findUnique.mockResolvedValue(null);
  });

  it("throws UNAUTHORIZED when no session", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = createCaller(ctx);

    await expect(
      caller.householdTest({ householdId: TEST_IDS.householdId })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws FORBIDDEN when user is not a household member", async () => {
    const ctx = createTestContext();
    const caller = createCaller(ctx);

    prismaMock.householdMember.findUnique.mockResolvedValue(null);

    await expect(
      caller.householdTest({ householdId: TEST_IDS.householdId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows access and provides memberRole via householdId", async () => {
    const ctx = createTestContext();
    const caller = createCaller(ctx);

    prismaMock.householdMember.findUnique.mockResolvedValue(
      createTestMembership({ role: "ADMIN" }) as never
    );

    const result = await caller.householdTest({ householdId: TEST_IDS.householdId });

    expect(result.role).toBe("ADMIN");
  });

  it("validates access via childId lookup", async () => {
    const ctx = createTestContext();
    const caller = createCaller(ctx);

    prismaMock.child.findUnique.mockResolvedValue(
      createTestChild() as never
    );
    prismaMock.householdMember.findUnique.mockResolvedValue(
      createTestMembership({ role: "CAREGIVER" }) as never
    );

    const result = await caller.householdByChildTest({ childId: TEST_IDS.childId });
    expect(result.role).toBe("CAREGIVER");
  });

  it("validates access via id parameter (for schemas using id)", async () => {
    const ctx = createTestContext();
    const caller = createCaller(ctx);

    prismaMock.child.findUnique.mockResolvedValue(
      createTestChild() as never
    );
    prismaMock.householdMember.findUnique.mockResolvedValue(
      createTestMembership({ role: "VIEWER" }) as never
    );

    const result = await caller.householdByIdTest({ id: TEST_IDS.childId });
    expect(result.role).toBe("VIEWER");
  });

  it("throws FORBIDDEN when child belongs to different household", async () => {
    const ctx = createTestContext();
    const caller = createCaller(ctx);

    const otherHouseholdId = "clq1234567890abcdefghij99";
    prismaMock.child.findUnique.mockResolvedValue(
      createTestChild({ householdId: otherHouseholdId }) as never
    );
    prismaMock.householdMember.findUnique.mockResolvedValue(null);

    await expect(
      caller.householdByChildTest({ childId: TEST_IDS.childId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
