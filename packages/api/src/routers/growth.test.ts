import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../test/setup";
import {
  createTestContext,
  createTestMembership,
  createTestChild,
  TEST_IDS,
} from "../test/helpers";
import { createCallerFactory } from "../trpc";
import { growthRouter } from "./growth";

const createCaller = createCallerFactory(growthRouter);

function createTestGrowthRecord(overrides?: Record<string, unknown>) {
  return {
    id: TEST_IDS.growthId,
    childId: TEST_IDS.childId,
    date: new Date("2024-01-15"),
    weightKg: 5.5,
    heightCm: 60,
    headCircumferenceCm: 40,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("growthRouter", () => {
  const childId = TEST_IDS.childId;
  const recordId = TEST_IDS.growthId;

  beforeEach(() => {
    prismaMock.child.findUnique.mockResolvedValue(createTestChild() as never);
    prismaMock.householdMember.findUnique.mockResolvedValue(
      createTestMembership({ role: "CAREGIVER" }) as never
    );
  });

  describe("list", () => {
    it("returns growth records", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const records = [createTestGrowthRecord()];
      prismaMock.growthRecord.findMany.mockResolvedValue(records as never);

      const result = await caller.list({ childId });

      expect(result).toHaveLength(1);
    });

    it("filters by date range", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.growthRecord.findMany.mockResolvedValue([]);

      await caller.list({
        childId,
        dateRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-12-31"),
        },
      });

      expect(prismaMock.growthRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.any(Object),
          }),
        })
      );
    });
  });

  describe("getLatest", () => {
    it("returns latest growth record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.growthRecord.findFirst.mockResolvedValue(
        createTestGrowthRecord() as never
      );

      const result = await caller.getLatest({ childId });

      expect(result?.weightKg).toBe(5.5);
    });

    it("returns null when no records exist", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.growthRecord.findFirst.mockResolvedValue(null);

      const result = await caller.getLatest({ childId });

      expect(result).toBeNull();
    });
  });

  describe("log", () => {
    it("logs growth measurements", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.growthRecord.create.mockResolvedValue(
        createTestGrowthRecord() as never
      );

      const result = await caller.log({
        childId,
        date: new Date(),
        weightKg: 6.0,
        heightCm: 62,
        headCircumferenceCm: 41,
      });

      expect(prismaMock.growthRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            weightKg: 6.0,
            heightCm: 62,
            headCircumferenceCm: 41,
          }),
        })
      );
    });

    it("throws FORBIDDEN for VIEWER", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "VIEWER" }) as never
      );

      await expect(
        caller.log({ childId, date: new Date() })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("update", () => {
    it("updates growth record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.growthRecord.update.mockResolvedValue(
        createTestGrowthRecord({ weightKg: 6.2 }) as never
      );

      const result = await caller.update({ id: recordId, weightKg: 6.2 });

      expect(prismaMock.growthRecord.update).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deletes growth record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.growthRecord.delete.mockResolvedValue(
        createTestGrowthRecord() as never
      );

      const result = await caller.delete({ id: recordId });

      expect(result).toEqual({ success: true });
    });
  });
});
