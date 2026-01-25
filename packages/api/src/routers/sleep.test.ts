import { describe, it, expect, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { prismaMock } from "../test/setup";
import {
  createTestContext,
  createTestMembership,
  createTestChild,
  createTestSleepRecord,
  TEST_IDS,
} from "../test/helpers";
import { createCallerFactory } from "../trpc";
import { sleepRouter } from "./sleep";

const createCaller = createCallerFactory(sleepRouter);

describe("sleepRouter", () => {
  const childId = TEST_IDS.childId;
  const recordId = TEST_IDS.sleepId;

  beforeEach(() => {
    // Setup default household membership
    prismaMock.child.findUnique.mockResolvedValue(createTestChild() as never);
    prismaMock.householdMember.findUnique.mockResolvedValue(
      createTestMembership({ role: "CAREGIVER" }) as never
    );
  });

  describe("list", () => {
    it("returns sleep records for a child", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const records = [createTestSleepRecord(), createTestSleepRecord({ id: "id2" })];
      prismaMock.sleepRecord.findMany.mockResolvedValue(records as never);

      const result = await caller.list({ childId });

      expect(result).toHaveLength(2);
      expect(prismaMock.sleepRecord.findMany).toHaveBeenCalled();
    });

    it("filters by period", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.sleepRecord.findMany.mockResolvedValue([]);

      await caller.list({ childId, period: "week" });

      expect(prismaMock.sleepRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            childId,
            startTime: expect.any(Object),
          }),
        })
      );
    });
  });

  describe("getActive", () => {
    it("returns active sleep session", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const activeSleep = createTestSleepRecord({ endTime: null });
      prismaMock.sleepRecord.findFirst.mockResolvedValue(activeSleep as never);

      const result = await caller.getActive({ childId });

      expect(result).toBeDefined();
      expect(result?.endTime).toBeNull();
    });

    it("returns null when no active session", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.sleepRecord.findFirst.mockResolvedValue(null);

      const result = await caller.getActive({ childId });

      expect(result).toBeNull();
    });
  });

  describe("start", () => {
    it("creates a new sleep record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.sleepRecord.findFirst.mockResolvedValue(null);
      prismaMock.sleepRecord.create.mockResolvedValue(
        createTestSleepRecord({ endTime: null }) as never
      );

      const result = await caller.start({ childId, sleepType: "NAP" });

      expect(result).toBeDefined();
      expect(prismaMock.sleepRecord.create).toHaveBeenCalled();
    });

    it("throws CONFLICT when active session exists", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.sleepRecord.findFirst.mockResolvedValue(
        createTestSleepRecord({ endTime: null }) as never
      );

      await expect(
        caller.start({ childId, sleepType: "NAP" })
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });

    it("throws FORBIDDEN for VIEWER role", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "VIEWER" }) as never
      );

      await expect(
        caller.start({ childId, sleepType: "NAP" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("end", () => {
    it("ends an active sleep session", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.sleepRecord.update.mockResolvedValue(
        createTestSleepRecord() as never
      );

      const result = await caller.end({ id: recordId });

      expect(result).toBeDefined();
      expect(result.endTime).not.toBeNull();
    });

    it("accepts quality and notes", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.sleepRecord.update.mockResolvedValue(
        createTestSleepRecord({ quality: 4, notes: "Good sleep" }) as never
      );

      const result = await caller.end({
        id: recordId,
        quality: 4,
        notes: "Good sleep",
      });

      expect(prismaMock.sleepRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quality: 4,
            notes: "Good sleep",
          }),
        })
      );
    });

    it("throws FORBIDDEN for VIEWER role", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "VIEWER" }) as never
      );

      await expect(caller.end({ id: recordId })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });

  describe("log", () => {
    it("logs a completed sleep record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const startTime = new Date("2024-01-15T10:00:00");
      const endTime = new Date("2024-01-15T12:00:00");

      prismaMock.sleepRecord.create.mockResolvedValue(
        createTestSleepRecord({ startTime, endTime }) as never
      );

      const result = await caller.log({
        childId,
        startTime,
        endTime,
        sleepType: "NAP",
      });

      expect(result).toBeDefined();
      expect(prismaMock.sleepRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            childId,
            startTime,
            endTime,
            sleepType: "NAP",
          }),
        })
      );
    });
  });

  describe("update", () => {
    it("updates a sleep record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.sleepRecord.update.mockResolvedValue(
        createTestSleepRecord({ sleepType: "NIGHT" }) as never
      );

      const result = await caller.update({ id: recordId, sleepType: "NIGHT" });

      expect(result.sleepType).toBe("NIGHT");
    });
  });

  describe("delete", () => {
    it("deletes a sleep record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.sleepRecord.delete.mockResolvedValue(
        createTestSleepRecord() as never
      );

      const result = await caller.delete({ id: recordId });

      expect(result).toEqual({ success: true });
      expect(prismaMock.sleepRecord.delete).toHaveBeenCalledWith({
        where: { id: recordId },
      });
    });
  });

  describe("summary", () => {
    it("returns sleep summary for period", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const records = [
        createTestSleepRecord({ sleepType: "NAP" }),
        createTestSleepRecord({ id: "id2", sleepType: "NIGHT" }),
      ];
      prismaMock.sleepRecord.findMany.mockResolvedValue(records as never);

      const result = await caller.summary({ childId, period: "today" });

      expect(result.totalSessions).toBe(2);
      expect(result.napCount).toBe(1);
      expect(result.nightCount).toBe(1);
    });
  });
});
