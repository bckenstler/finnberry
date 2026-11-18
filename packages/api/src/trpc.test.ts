import { describe, it, expect, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { prismaMock } from "./test/setup";
import {
  createTestContext,
  createUnauthenticatedContext,
  createTestMembership,
  createTestChild,
  mockMemberships,
  mockRecordOwnership,
  TEST_IDS,
} from "./test/helpers";
import {
  createCallerFactory,
  createTRPCRouter,
  protectedProcedure,
  householdProcedure,
  childProcedure,
  medicineProcedure,
  byIdProcedure,
} from "./trpc";

const OTHER_HOUSEHOLD_ID = "clq1234567890abcdefghij99";

const describeAccess = ({ ctx }: { ctx: { householdId: string; memberRole: string } }) => ({
  householdId: ctx.householdId,
  role: ctx.memberRole,
});

// Create test routers for middleware testing
const testRouter = createTRPCRouter({
  protectedTest: protectedProcedure.query(() => {
    return { success: true };
  }),
  householdTest: householdProcedure.query(describeAccess),
  childTest: childProcedure.query(describeAccess),
  medicineTest: medicineProcedure.query(describeAccess),
  childByIdTest: byIdProcedure("child").query(describeAccess),
  householdByIdTest: byIdProcedure("household").query(describeAccess),
  sleepRecordByIdTest: byIdProcedure("sleepRecord").query(describeAccess),
  medicineRecordByIdTest: byIdProcedure("medicineRecord").query(describeAccess),
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

describe("household-scoped procedures", () => {
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
    const caller = createCaller(createTestContext());

    await expect(
      caller.householdTest({ householdId: TEST_IDS.householdId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows access and provides memberRole via householdId", async () => {
    const caller = createCaller(createTestContext());

    prismaMock.householdMember.findUnique.mockResolvedValue(
      createTestMembership({ role: "ADMIN" }) as never
    );

    const result = await caller.householdTest({ householdId: TEST_IDS.householdId });

    expect(result).toEqual({ householdId: TEST_IDS.householdId, role: "ADMIN" });
  });

  it("validates access via childId lookup", async () => {
    const caller = createCaller(createTestContext());

    prismaMock.child.findUnique.mockResolvedValue(createTestChild() as never);
    mockMemberships([{ role: "CAREGIVER" }]);

    const result = await caller.childTest({ childId: TEST_IDS.childId });
    expect(result).toEqual({ householdId: TEST_IDS.householdId, role: "CAREGIVER" });
  });

  it("validates access via an id that names a child", async () => {
    const caller = createCaller(createTestContext());

    prismaMock.child.findUnique.mockResolvedValue(createTestChild() as never);
    mockMemberships([{ role: "VIEWER" }]);

    const result = await caller.childByIdTest({ id: TEST_IDS.childId });
    expect(result.role).toBe("VIEWER");
  });

  it("throws FORBIDDEN when child belongs to different household", async () => {
    const caller = createCaller(createTestContext());

    prismaMock.child.findUnique.mockResolvedValue(
      createTestChild({ householdId: OTHER_HOUSEHOLD_ID }) as never
    );
    mockMemberships([{ role: "OWNER" }]);

    await expect(
      caller.childTest({ childId: TEST_IDS.childId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when the child does not exist", async () => {
    const caller = createCaller(createTestContext());
    mockMemberships([{ role: "OWNER" }]);

    await expect(
      caller.childTest({ childId: TEST_IDS.childId })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  describe("an extra householdId in the input", () => {
    // The caller owns TEST_IDS.householdId and names it alongside a resource
    // from a household they do not belong to.
    beforeEach(() => {
      mockMemberships([{ role: "OWNER" }]);
    });

    it("does not authorize another household's child", async () => {
      const caller = createCaller(createTestContext());
      prismaMock.child.findUnique.mockResolvedValue(
        createTestChild({ householdId: OTHER_HOUSEHOLD_ID }) as never
      );

      await expect(
        caller.childTest({
          childId: TEST_IDS.childId,
          householdId: TEST_IDS.householdId,
        } as never)
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("does not authorize another household addressed by id", async () => {
      const caller = createCaller(createTestContext());

      await expect(
        caller.householdByIdTest({
          id: OTHER_HOUSEHOLD_ID,
          householdId: TEST_IDS.householdId,
        } as never)
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("a record addressed by id", () => {
    it("provides the role for a record in the caller's household", async () => {
      const caller = createCaller(createTestContext());
      mockRecordOwnership();
      mockMemberships([{ role: "CAREGIVER" }]);

      const result = await caller.sleepRecordByIdTest({ id: TEST_IDS.sleepId });

      expect(result).toEqual({ householdId: TEST_IDS.householdId, role: "CAREGIVER" });
    });

    it("throws FORBIDDEN for a record in another household", async () => {
      const caller = createCaller(createTestContext());
      mockRecordOwnership(OTHER_HOUSEHOLD_ID);
      mockMemberships([{ role: "OWNER" }]);

      await expect(
        caller.sleepRecordByIdTest({ id: TEST_IDS.sleepId })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("throws NOT_FOUND for a record that does not exist", async () => {
      const caller = createCaller(createTestContext());
      mockMemberships([{ role: "OWNER" }]);

      await expect(
        caller.sleepRecordByIdTest({ id: TEST_IDS.sleepId })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("resolves a medicine record through its medicine", async () => {
      const caller = createCaller(createTestContext());
      mockRecordOwnership(OTHER_HOUSEHOLD_ID);
      mockMemberships([{ role: "OWNER" }]);

      await expect(
        caller.medicineRecordByIdTest({ id: TEST_IDS.recordId })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  it("throws FORBIDDEN for a medicineId in another household", async () => {
    const caller = createCaller(createTestContext());
    mockRecordOwnership(OTHER_HOUSEHOLD_ID);
    mockMemberships([{ role: "OWNER" }]);

    await expect(
      caller.medicineTest({ medicineId: TEST_IDS.medicineId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an id that is not a cuid", async () => {
    const caller = createCaller(createTestContext());

    await expect(
      caller.sleepRecordByIdTest({ id: "not-a-cuid" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
