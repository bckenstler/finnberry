import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../test/setup";
import {
  createTestContext,
  createTestMembership,
  createTestChild,
  TEST_IDS,
} from "../test/helpers";
import { createCallerFactory } from "../trpc";
import { pumpingRouter } from "./pumping";

const createCaller = createCallerFactory(pumpingRouter);

function createTestPumpingRecord(overrides?: Record<string, unknown>) {
  return {
    id: TEST_IDS.pumpingId,
    childId: TEST_IDS.childId,
    startTime: new Date("2024-01-15T10:00:00"),
    endTime: new Date("2024-01-15T10:30:00"),
    amountMl: 100,
    side: "BOTH" as const,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("pumpingRouter", () => {
  const childId = TEST_IDS.childId;
  const recordId = TEST_IDS.pumpingId;

  beforeEach(() => {
    prismaMock.child.findUnique.mockResolvedValue(createTestChild() as never);
    prismaMock.householdMember.findUnique.mockResolvedValue(
      createTestMembership({ role: "CAREGIVER" }) as never
    );
  });

  describe("list", () => {
    it("returns pumping records", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const records = [createTestPumpingRecord()];
      prismaMock.pumpingRecord.findMany.mockResolvedValue(records as never);

      const result = await caller.list({ childId });

      expect(result).toHaveLength(1);
    });
  });


  describe("start", () => {
    it("creates a pumping session", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.pumpingRecord.create.mockResolvedValue(
        createTestPumpingRecord({ endTime: null }) as never
      );

      const result = await caller.start({ childId, side: "LEFT" });

      expect(result).toBeDefined();
    });

    it("throws FORBIDDEN for VIEWER", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "VIEWER" }) as never
      );

      await expect(caller.start({ childId })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });

  describe("end", () => {
    it("ends a pumping session with amount", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.pumpingRecord.update.mockResolvedValue(
        createTestPumpingRecord({ amountMl: 120 }) as never
      );

      const result = await caller.end({ id: recordId, amountMl: 120 });

      expect(prismaMock.pumpingRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amountMl: 120,
          }),
        })
      );
    });
  });

  describe("log", () => {
    it("logs a completed pumping session", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.pumpingRecord.create.mockResolvedValue(
        createTestPumpingRecord() as never
      );

      const result = await caller.log({
        childId,
        startTime: new Date(),
        amountMl: 100,
        side: "BOTH",
      });

      expect(prismaMock.pumpingRecord.create).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deletes a pumping record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.pumpingRecord.delete.mockResolvedValue(
        createTestPumpingRecord() as never
      );

      const result = await caller.delete({ id: recordId });

      expect(result).toEqual({ success: true });
    });
  });

  describe("summary", () => {
    it("returns pumping summary", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const records = [
        createTestPumpingRecord({ amountMl: 100 }),
        createTestPumpingRecord({ id: "id2", amountMl: 80 }),
      ];
      prismaMock.pumpingRecord.findMany.mockResolvedValue(records as never);

      const result = await caller.summary({ childId });

      expect(result.totalSessions).toBe(2);
      expect(result.totalMl).toBe(180);
    });
  });
});
