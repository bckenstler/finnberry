import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../test/setup";
import {
  createTestContext,
  createTestMembership,
  createTestChild,
  TEST_IDS,
} from "../test/helpers";
import { createCallerFactory } from "../trpc";
import { activityRouter } from "./activity";

const createCaller = createCallerFactory(activityRouter);

function createTestActivityRecord(overrides?: Record<string, unknown>) {
  return {
    id: TEST_IDS.activityId,
    childId: TEST_IDS.childId,
    activityType: "TUMMY_TIME" as const,
    startTime: new Date("2024-01-15T10:00:00"),
    endTime: new Date("2024-01-15T10:15:00"),
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("activityRouter", () => {
  const childId = TEST_IDS.childId;
  const recordId = TEST_IDS.activityId;

  beforeEach(() => {
    prismaMock.child.findUnique.mockResolvedValue(createTestChild() as never);
    prismaMock.householdMember.findUnique.mockResolvedValue(
      createTestMembership({ role: "CAREGIVER" }) as never
    );
  });

  describe("list", () => {
    it("returns activity records", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const records = [
        createTestActivityRecord({ activityType: "TUMMY_TIME" }),
        createTestActivityRecord({ id: "id2", activityType: "BATH" }),
      ];
      prismaMock.activityRecord.findMany.mockResolvedValue(records as never);

      const result = await caller.list({ childId });

      expect(result).toHaveLength(2);
    });

    it("filters by activity type", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.activityRecord.findMany.mockResolvedValue([]);

      await caller.list({ childId, activityType: "BATH" });

      expect(prismaMock.activityRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            activityType: "BATH",
          }),
        })
      );
    });
  });


  describe("start", () => {
    it("starts an activity", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.activityRecord.create.mockResolvedValue(
        createTestActivityRecord({ endTime: null }) as never
      );

      const result = await caller.start({ childId, activityType: "TUMMY_TIME" });

      expect(result.activityType).toBe("TUMMY_TIME");
    });

    it("throws FORBIDDEN for VIEWER", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "VIEWER" }) as never
      );

      await expect(
        caller.start({ childId, activityType: "BATH" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("end", () => {
    it("ends an activity", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.activityRecord.update.mockResolvedValue(
        createTestActivityRecord() as never
      );

      const result = await caller.end({ id: recordId });

      expect(result.endTime).not.toBeNull();
    });
  });

  describe("log", () => {
    it("logs a completed activity", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.activityRecord.create.mockResolvedValue(
        createTestActivityRecord() as never
      );

      const result = await caller.log({
        childId,
        activityType: "OUTDOOR_PLAY",
        startTime: new Date(),
        endTime: new Date(),
      });

      expect(prismaMock.activityRecord.create).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("updates an activity", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.activityRecord.update.mockResolvedValue(
        createTestActivityRecord({ notes: "Fun time" }) as never
      );

      const result = await caller.update({ id: recordId, notes: "Fun time" });

      expect(prismaMock.activityRecord.update).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deletes an activity", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.activityRecord.delete.mockResolvedValue(
        createTestActivityRecord() as never
      );

      const result = await caller.delete({ id: recordId });

      expect(result).toEqual({ success: true });
    });
  });

  describe("summary", () => {
    it("returns activity summary", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const records = [
        createTestActivityRecord({ activityType: "TUMMY_TIME" }),
        createTestActivityRecord({ id: "id2", activityType: "TUMMY_TIME" }),
        createTestActivityRecord({ id: "id3", activityType: "BATH" }),
      ];
      prismaMock.activityRecord.findMany.mockResolvedValue(records as never);

      const result = await caller.summary({ childId });

      expect(result.totalActivities).toBe(3);
      expect(result.byType.TUMMY_TIME.count).toBe(2);
      expect(result.byType.BATH.count).toBe(1);
    });
  });
});
