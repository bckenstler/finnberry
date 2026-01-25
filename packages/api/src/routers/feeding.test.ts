import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../test/setup";
import {
  createTestContext,
  createTestMembership,
  createTestChild,
  createTestFeedingRecord,
  TEST_IDS,
} from "../test/helpers";
import { createCallerFactory } from "../trpc";
import { feedingRouter } from "./feeding";

const createCaller = createCallerFactory(feedingRouter);

describe("feedingRouter", () => {
  const childId = TEST_IDS.childId;
  const recordId = TEST_IDS.feedingId;

  beforeEach(() => {
    prismaMock.child.findUnique.mockResolvedValue(createTestChild() as never);
    prismaMock.householdMember.findUnique.mockResolvedValue(
      createTestMembership({ role: "CAREGIVER" }) as never
    );
  });

  describe("list", () => {
    it("returns feeding records", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const records = [
        createTestFeedingRecord({ feedingType: "BREAST" }),
        createTestFeedingRecord({ id: "id2", feedingType: "BOTTLE" }),
      ];
      prismaMock.feedingRecord.findMany.mockResolvedValue(records as never);

      const result = await caller.list({ childId });

      expect(result).toHaveLength(2);
    });

    it("filters by feeding type", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.feedingRecord.findMany.mockResolvedValue([]);

      await caller.list({ childId, feedingType: "BOTTLE" });

      expect(prismaMock.feedingRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            feedingType: "BOTTLE",
          }),
        })
      );
    });
  });

  describe("getActive", () => {
    it("returns active breastfeeding session", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const activeFeeding = createTestFeedingRecord({ endTime: null });
      prismaMock.feedingRecord.findFirst.mockResolvedValue(activeFeeding as never);

      const result = await caller.getActive({ childId });

      expect(result?.endTime).toBeNull();
    });

    it("returns null when no active session", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.feedingRecord.findFirst.mockResolvedValue(null);

      const result = await caller.getActive({ childId });

      expect(result).toBeNull();
    });
  });

  describe("startBreastfeeding", () => {
    it("creates a breastfeeding session", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.feedingRecord.findFirst.mockResolvedValue(null);
      prismaMock.feedingRecord.create.mockResolvedValue(
        createTestFeedingRecord({ endTime: null, side: "LEFT" }) as never
      );

      const result = await caller.startBreastfeeding({ childId, side: "LEFT" });

      expect(result.side).toBe("LEFT");
      expect(result.feedingType).toBe("BREAST");
    });

    it("throws CONFLICT when active session exists", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.feedingRecord.findFirst.mockResolvedValue(
        createTestFeedingRecord({ endTime: null }) as never
      );

      await expect(
        caller.startBreastfeeding({ childId, side: "LEFT" })
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });

    it("throws FORBIDDEN for VIEWER", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "VIEWER" }) as never
      );

      await expect(
        caller.startBreastfeeding({ childId, side: "LEFT" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("endBreastfeeding", () => {
    it("ends a breastfeeding session", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.feedingRecord.update.mockResolvedValue(
        createTestFeedingRecord() as never
      );

      const result = await caller.endBreastfeeding({ id: recordId });

      expect(result.endTime).not.toBeNull();
    });
  });

  describe("logBreastfeeding", () => {
    it("logs a completed breastfeeding session", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const startTime = new Date("2024-01-15T10:00:00");
      const endTime = new Date("2024-01-15T10:30:00");

      prismaMock.feedingRecord.create.mockResolvedValue(
        createTestFeedingRecord({ startTime, endTime, side: "BOTH" }) as never
      );

      const result = await caller.logBreastfeeding({
        childId,
        startTime,
        side: "BOTH",
      });

      expect(result.feedingType).toBe("BREAST");
    });
  });

  describe("logBottle", () => {
    it("logs a bottle feeding", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.feedingRecord.create.mockResolvedValue(
        createTestFeedingRecord({
          feedingType: "BOTTLE",
          amountMl: 150,
          side: null,
        }) as never
      );

      const result = await caller.logBottle({
        childId,
        startTime: new Date(),
        amountMl: 150,
      });

      expect(prismaMock.feedingRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            feedingType: "BOTTLE",
            amountMl: 150,
          }),
        })
      );
    });
  });

  describe("logSolids", () => {
    it("logs a solids feeding", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.feedingRecord.create.mockResolvedValue(
        createTestFeedingRecord({
          feedingType: "SOLIDS",
          foodItems: ["banana", "avocado"],
        }) as never
      );

      const result = await caller.logSolids({
        childId,
        startTime: new Date(),
        foodItems: ["banana", "avocado"],
      });

      expect(prismaMock.feedingRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            feedingType: "SOLIDS",
            foodItems: ["banana", "avocado"],
          }),
        })
      );
    });
  });

  describe("update", () => {
    it("updates a feeding record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.feedingRecord.update.mockResolvedValue(
        createTestFeedingRecord({ amountMl: 200 }) as never
      );

      const result = await caller.update({ id: recordId, amountMl: 200 });

      expect(prismaMock.feedingRecord.update).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deletes a feeding record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.feedingRecord.delete.mockResolvedValue(
        createTestFeedingRecord() as never
      );

      const result = await caller.delete({ id: recordId });

      expect(result).toEqual({ success: true });
    });
  });

  describe("summary", () => {
    it("returns feeding summary", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const records = [
        createTestFeedingRecord({ feedingType: "BREAST", side: "LEFT" }),
        createTestFeedingRecord({
          id: "id2",
          feedingType: "BREAST",
          side: "RIGHT",
        }),
        createTestFeedingRecord({
          id: "id3",
          feedingType: "BOTTLE",
          amountMl: 150,
          side: null,
        }),
        createTestFeedingRecord({
          id: "id4",
          feedingType: "SOLIDS",
          foodItems: ["banana"],
          side: null,
        }),
      ];
      prismaMock.feedingRecord.findMany.mockResolvedValue(records as never);

      const result = await caller.summary({ childId, period: "today" });

      expect(result.totalFeedings).toBe(4);
      expect(result.breastfeedingCount).toBe(2);
      expect(result.bottleCount).toBe(1);
      expect(result.totalBottleMl).toBe(150);
      expect(result.solidsCount).toBe(1);
    });

    it("tracks last side used", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const records = [
        createTestFeedingRecord({
          feedingType: "BREAST",
          side: "LEFT",
          startTime: new Date("2024-01-15T10:00:00"),
        }),
        createTestFeedingRecord({
          id: "id2",
          feedingType: "BREAST",
          side: "RIGHT",
          startTime: new Date("2024-01-15T12:00:00"),
        }),
      ];
      prismaMock.feedingRecord.findMany.mockResolvedValue(records as never);

      const result = await caller.summary({ childId });

      expect(result.lastLeftSide).toEqual(new Date("2024-01-15T10:00:00"));
      expect(result.lastRightSide).toEqual(new Date("2024-01-15T12:00:00"));
    });
  });
});
