import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../test/setup";
import {
  createTestContext,
  createTestMembership,
  createTestChild,
  createTestDiaperRecord,
  TEST_IDS,
} from "../test/helpers";
import { createCallerFactory } from "../trpc";
import { diaperRouter } from "./diaper";

const createCaller = createCallerFactory(diaperRouter);

describe("diaperRouter", () => {
  const childId = TEST_IDS.childId;
  const recordId = TEST_IDS.diaperId;

  beforeEach(() => {
    prismaMock.child.findUnique.mockResolvedValue(createTestChild() as never);
    prismaMock.householdMember.findUnique.mockResolvedValue(
      createTestMembership({ role: "CAREGIVER" }) as never
    );
  });

  describe("list", () => {
    it("returns diaper records for a child", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const records = [
        createTestDiaperRecord({ diaperType: "WET" }),
        createTestDiaperRecord({ id: "id2", diaperType: "DIRTY" }),
      ];
      prismaMock.diaperRecord.findMany.mockResolvedValue(records as never);

      const result = await caller.list({ childId });

      expect(result).toHaveLength(2);
    });

    it("filters by diaper type", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.diaperRecord.findMany.mockResolvedValue([]);

      await caller.list({ childId, diaperType: "WET" });

      expect(prismaMock.diaperRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            childId,
            diaperType: "WET",
          }),
        })
      );
    });

    it("filters by period", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.diaperRecord.findMany.mockResolvedValue([]);

      await caller.list({ childId, period: "today" });

      expect(prismaMock.diaperRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            childId,
            time: expect.any(Object),
          }),
        })
      );
    });
  });

  describe("log", () => {
    it("creates a diaper record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.diaperRecord.create.mockResolvedValue(
        createTestDiaperRecord({ diaperType: "BOTH" }) as never
      );

      const result = await caller.log({ childId, diaperType: "BOTH" });

      expect(result.diaperType).toBe("BOTH");
    });

    it("accepts optional details", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.diaperRecord.create.mockResolvedValue(
        createTestDiaperRecord({
          diaperType: "DIRTY",
          color: "BROWN",
          consistency: "SOFT",
          notes: "Normal",
        }) as never
      );

      const result = await caller.log({
        childId,
        diaperType: "DIRTY",
        color: "BROWN",
        consistency: "SOFT",
        notes: "Normal",
      });

      expect(prismaMock.diaperRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            color: "BROWN",
            consistency: "SOFT",
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

      await expect(
        caller.log({ childId, diaperType: "WET" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("update", () => {
    it("updates a diaper record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.diaperRecord.update.mockResolvedValue(
        createTestDiaperRecord({ diaperType: "BOTH" }) as never
      );

      const result = await caller.update({ id: recordId, diaperType: "BOTH" });

      expect(result.diaperType).toBe("BOTH");
    });

    it("throws FORBIDDEN for VIEWER role", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "VIEWER" }) as never
      );

      await expect(
        caller.update({ id: recordId, diaperType: "DRY" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("delete", () => {
    it("deletes a diaper record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.diaperRecord.delete.mockResolvedValue(
        createTestDiaperRecord() as never
      );

      const result = await caller.delete({ id: recordId });

      expect(result).toEqual({ success: true });
    });

    it("throws FORBIDDEN for VIEWER role", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "VIEWER" }) as never
      );

      await expect(caller.delete({ id: recordId })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });

  describe("summary", () => {
    it("returns diaper summary for period", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const records = [
        createTestDiaperRecord({ diaperType: "WET" }),
        createTestDiaperRecord({ id: "id2", diaperType: "DIRTY" }),
        createTestDiaperRecord({ id: "id3", diaperType: "BOTH" }),
        createTestDiaperRecord({ id: "id4", diaperType: "DRY" }),
      ];
      prismaMock.diaperRecord.findMany.mockResolvedValue(records as never);

      const result = await caller.summary({ childId, period: "today" });

      expect(result.totalChanges).toBe(4);
      expect(result.wetCount).toBe(2); // WET + BOTH
      expect(result.dirtyCount).toBe(2); // DIRTY + BOTH
      expect(result.dryCount).toBe(1);
    });

    it("returns last change info", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const lastTime = new Date("2024-01-15T14:00:00");
      const records = [
        createTestDiaperRecord({ time: lastTime, diaperType: "WET" }),
      ];
      prismaMock.diaperRecord.findMany.mockResolvedValue(records as never);

      const result = await caller.summary({ childId });

      expect(result.lastChange).toEqual(lastTime);
      expect(result.lastType).toBe("WET");
    });

    it("returns null for last change when no records", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.diaperRecord.findMany.mockResolvedValue([]);

      const result = await caller.summary({ childId });

      expect(result.lastChange).toBeNull();
      expect(result.lastType).toBeNull();
    });
  });
});
