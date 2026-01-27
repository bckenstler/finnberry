import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../test/setup";
import {
  createTestContext,
  createTestMembership,
  createTestChild,
  createTestSleepRecord,
  createTestFeedingRecord,
  createTestDiaperRecord,
  TEST_IDS,
} from "../test/helpers";
import { createCallerFactory } from "../trpc";
import { timelineRouter } from "./timeline";

const createCaller = createCallerFactory(timelineRouter);

describe("timelineRouter", () => {
  const childId = TEST_IDS.childId;

  beforeEach(() => {
    // Setup default household membership
    prismaMock.child.findUnique.mockResolvedValue(createTestChild() as never);
    prismaMock.householdMember.findUnique.mockResolvedValue(
      createTestMembership({ role: "CAREGIVER" }) as never
    );
  });

  describe("getLastActivities", () => {
    it("returns last activities for a child", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const lastSleep = createTestSleepRecord();
      const lastBreastfeeding = createTestFeedingRecord({ feedingType: "BREAST" });
      const lastBottle = createTestFeedingRecord({ feedingType: "BOTTLE", id: "bottle1" });
      const lastSolids = createTestFeedingRecord({ feedingType: "SOLIDS", id: "solids1" });
      const lastDiaper = createTestDiaperRecord();

      prismaMock.sleepRecord.findFirst
        .mockResolvedValueOnce(lastSleep as never) // last completed sleep
        .mockResolvedValueOnce(null); // active sleep

      prismaMock.feedingRecord.findFirst
        .mockResolvedValueOnce(lastBreastfeeding as never) // last breastfeeding
        .mockResolvedValueOnce(null) // active feeding
        .mockResolvedValueOnce(lastBottle as never) // last bottle
        .mockResolvedValueOnce(lastSolids as never); // last solids

      prismaMock.diaperRecord.findFirst.mockResolvedValue(lastDiaper as never);

      const result = await caller.getLastActivities({ childId });

      expect(result.lastSleep).toEqual(lastSleep);
      expect(result.activeSleep).toBeNull();
      expect(result.lastBreastfeeding).toEqual(lastBreastfeeding);
      expect(result.activeFeeding).toBeNull();
      expect(result.lastBottle).toEqual(lastBottle);
      expect(result.lastSolids).toEqual(lastSolids);
      expect(result.lastDiaper).toEqual(lastDiaper);
    });

    it("returns active sleep when ongoing", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const activeSleep = createTestSleepRecord({ endTime: null });

      prismaMock.sleepRecord.findFirst
        .mockResolvedValueOnce(null) // last completed sleep
        .mockResolvedValueOnce(activeSleep as never); // active sleep

      prismaMock.feedingRecord.findFirst.mockResolvedValue(null);
      prismaMock.diaperRecord.findFirst.mockResolvedValue(null);

      const result = await caller.getLastActivities({ childId });

      expect(result.activeSleep).toEqual(activeSleep);
      expect(result.activeSleep?.endTime).toBeNull();
    });

    it("returns active feeding when ongoing", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const activeFeeding = createTestFeedingRecord({ endTime: null });

      prismaMock.sleepRecord.findFirst.mockResolvedValue(null);
      prismaMock.feedingRecord.findFirst
        .mockResolvedValueOnce(null) // last breastfeeding
        .mockResolvedValueOnce(activeFeeding as never) // active feeding
        .mockResolvedValueOnce(null) // last bottle
        .mockResolvedValueOnce(null); // last solids

      prismaMock.diaperRecord.findFirst.mockResolvedValue(null);

      const result = await caller.getLastActivities({ childId });

      expect(result.activeFeeding).toEqual(activeFeeding);
      expect(result.activeFeeding?.endTime).toBeNull();
    });
  });

  describe("getDay", () => {
    it("returns day timeline data", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const date = new Date("2024-01-15T12:00:00");
      const sleepRecords = [createTestSleepRecord()];
      const feedingRecords = [createTestFeedingRecord()];
      const diaperRecords = [createTestDiaperRecord()];

      prismaMock.sleepRecord.findMany.mockResolvedValue(sleepRecords as never);
      prismaMock.feedingRecord.findMany.mockResolvedValue(feedingRecords as never);
      prismaMock.diaperRecord.findMany.mockResolvedValue(diaperRecords as never);

      const result = await caller.getDay({ childId, date });

      expect(result.date).toEqual(date);
      expect(result.sleepRecords).toEqual(sleepRecords);
      expect(result.feedingRecords).toEqual(feedingRecords);
      expect(result.diaperRecords).toEqual(diaperRecords);
    });

    it("sets day boundaries starting at 8am", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const date = new Date("2024-01-15T12:00:00");

      prismaMock.sleepRecord.findMany.mockResolvedValue([]);
      prismaMock.feedingRecord.findMany.mockResolvedValue([]);
      prismaMock.diaperRecord.findMany.mockResolvedValue([]);

      const result = await caller.getDay({ childId, date });

      expect(result.dayStart.getHours()).toBe(8);
      expect(result.dayEnd.getHours()).toBe(8);
      // dayEnd should be 24 hours after dayStart
      const diffHours =
        (result.dayEnd.getTime() - result.dayStart.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBe(24);
    });

    it("includes sleep records that span the day", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const date = new Date("2024-01-15T12:00:00");

      prismaMock.sleepRecord.findMany.mockResolvedValue([]);
      prismaMock.feedingRecord.findMany.mockResolvedValue([]);
      prismaMock.diaperRecord.findMany.mockResolvedValue([]);

      await caller.getDay({ childId, date });

      // Check that the query includes OR conditions for spanning records
      expect(prismaMock.sleepRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            childId,
            OR: expect.arrayContaining([
              expect.objectContaining({ startTime: expect.any(Object) }),
              expect.objectContaining({ endTime: expect.any(Object) }),
            ]),
          }),
        })
      );
    });
  });

  describe("getWeek", () => {
    it("returns week timeline data", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const weekStart = new Date("2024-01-15T00:00:00");
      const sleepRecords = [createTestSleepRecord()];
      const feedingRecords = [createTestFeedingRecord()];
      const diaperRecords = [createTestDiaperRecord()];

      prismaMock.sleepRecord.findMany.mockResolvedValue(sleepRecords as never);
      prismaMock.feedingRecord.findMany.mockResolvedValue(feedingRecords as never);
      prismaMock.diaperRecord.findMany.mockResolvedValue(diaperRecords as never);

      const result = await caller.getWeek({ childId, weekStart });

      expect(result.weekStart).toBeDefined();
      expect(result.weekEnd).toBeDefined();
      expect(result.days).toHaveLength(7);
    });

    it("returns 7 days of data", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const weekStart = new Date("2024-01-15T00:00:00");

      prismaMock.sleepRecord.findMany.mockResolvedValue([]);
      prismaMock.feedingRecord.findMany.mockResolvedValue([]);
      prismaMock.diaperRecord.findMany.mockResolvedValue([]);

      const result = await caller.getWeek({ childId, weekStart });

      expect(result.days).toHaveLength(7);
      result.days.forEach((day) => {
        expect(day.date).toBeDefined();
        expect(day.dayStart).toBeDefined();
        expect(day.sleepRecords).toBeDefined();
        expect(day.feedingRecords).toBeDefined();
        expect(day.diaperRecords).toBeDefined();
      });
    });

    it("organizes records by day", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const weekStart = new Date("2024-01-15T00:00:00");

      // Create a record for Jan 15 at 10:00 (within first day's 8am-8am window)
      const day1Sleep = createTestSleepRecord({
        startTime: new Date("2024-01-15T10:00:00"),
        endTime: new Date("2024-01-15T12:00:00"),
      });

      prismaMock.sleepRecord.findMany.mockResolvedValue([day1Sleep] as never);
      prismaMock.feedingRecord.findMany.mockResolvedValue([]);
      prismaMock.diaperRecord.findMany.mockResolvedValue([]);

      const result = await caller.getWeek({ childId, weekStart });

      // The first day should contain the sleep record
      expect(result.days[0].sleepRecords).toHaveLength(1);
    });
  });

  describe("getList", () => {
    it("returns list timeline data", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const weekStart = new Date("2024-01-15T00:00:00");
      const sleepRecords = [createTestSleepRecord()];
      const feedingRecords = [createTestFeedingRecord()];
      const diaperRecords = [createTestDiaperRecord()];

      prismaMock.sleepRecord.findMany.mockResolvedValue(sleepRecords as never);
      prismaMock.feedingRecord.findMany.mockResolvedValue(feedingRecords as never);
      prismaMock.diaperRecord.findMany.mockResolvedValue(diaperRecords as never);

      const result = await caller.getList({ childId, weekStart });

      expect(result.weekStart).toBeDefined();
      expect(result.weekEnd).toBeDefined();
      expect(result.activities).toBeDefined();
      expect(result.groupedByDate).toBeDefined();
    });

    it("combines and sorts activities chronologically", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const weekStart = new Date("2024-01-15T00:00:00");

      const sleep = createTestSleepRecord({
        startTime: new Date("2024-01-15T10:00:00"),
      });
      const feeding = createTestFeedingRecord({
        startTime: new Date("2024-01-15T12:00:00"),
      });
      const diaper = createTestDiaperRecord({
        time: new Date("2024-01-15T11:00:00"),
      });

      prismaMock.sleepRecord.findMany.mockResolvedValue([sleep] as never);
      prismaMock.feedingRecord.findMany.mockResolvedValue([feeding] as never);
      prismaMock.diaperRecord.findMany.mockResolvedValue([diaper] as never);

      const result = await caller.getList({ childId, weekStart });

      expect(result.activities).toHaveLength(3);
      // Should be sorted descending (most recent first)
      expect(result.activities[0].type).toBe("FEEDING");
      expect(result.activities[1].type).toBe("DIAPER");
      expect(result.activities[2].type).toBe("SLEEP");
    });

    it("groups activities by date", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const weekStart = new Date("2024-01-15T00:00:00");

      const sleep = createTestSleepRecord({
        startTime: new Date("2024-01-15T10:00:00"),
      });
      const feeding = createTestFeedingRecord({
        startTime: new Date("2024-01-16T10:00:00"),
      });

      prismaMock.sleepRecord.findMany.mockResolvedValue([sleep] as never);
      prismaMock.feedingRecord.findMany.mockResolvedValue([feeding] as never);
      prismaMock.diaperRecord.findMany.mockResolvedValue([]);

      const result = await caller.getList({ childId, weekStart });

      expect(Object.keys(result.groupedByDate)).toContain("2024-01-15");
      expect(Object.keys(result.groupedByDate)).toContain("2024-01-16");
      expect(result.groupedByDate["2024-01-15"]).toHaveLength(1);
      expect(result.groupedByDate["2024-01-16"]).toHaveLength(1);
    });

    it("returns activity types correctly", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const weekStart = new Date("2024-01-15T00:00:00");

      const sleep = createTestSleepRecord();
      const feeding = createTestFeedingRecord();
      const diaper = createTestDiaperRecord();

      prismaMock.sleepRecord.findMany.mockResolvedValue([sleep] as never);
      prismaMock.feedingRecord.findMany.mockResolvedValue([feeding] as never);
      prismaMock.diaperRecord.findMany.mockResolvedValue([diaper] as never);

      const result = await caller.getList({ childId, weekStart });

      const types = result.activities.map((a) => a.type);
      expect(types).toContain("SLEEP");
      expect(types).toContain("FEEDING");
      expect(types).toContain("DIAPER");
    });
  });
});
