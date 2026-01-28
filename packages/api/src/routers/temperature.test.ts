import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../test/setup";
import {
  createTestContext,
  createTestMembership,
  createTestChild,
  createTestTemperatureRecord,
  TEST_IDS,
} from "../test/helpers";
import { createCallerFactory } from "../trpc";
import { temperatureRouter } from "./temperature";

const createCaller = createCallerFactory(temperatureRouter);

describe("temperatureRouter", () => {
  const childId = TEST_IDS.childId;
  const recordId = TEST_IDS.temperatureId;

  beforeEach(() => {
    // Setup default household membership
    prismaMock.child.findUnique.mockResolvedValue(createTestChild() as never);
    prismaMock.householdMember.findUnique.mockResolvedValue(
      createTestMembership({ role: "CAREGIVER" }) as never
    );
  });

  describe("list", () => {
    it("returns temperature records for a child", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const records = [
        createTestTemperatureRecord(),
        createTestTemperatureRecord({ id: "id2", temperatureCelsius: 38.5 }),
      ];
      prismaMock.temperatureRecord.findMany.mockResolvedValue(records as never);

      const result = await caller.list({ childId });

      expect(result).toHaveLength(2);
      expect(prismaMock.temperatureRecord.findMany).toHaveBeenCalled();
    });

    it("filters by dateRange", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.temperatureRecord.findMany.mockResolvedValue([]);

      const start = new Date("2024-01-01");
      const end = new Date("2024-01-31");

      await caller.list({
        childId,
        dateRange: { start, end },
      });

      expect(prismaMock.temperatureRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            childId,
            time: {
              gte: start,
              lte: end,
            },
          }),
        })
      );
    });

    it("returns empty array when no records exist", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.temperatureRecord.findMany.mockResolvedValue([]);

      const result = await caller.list({ childId });

      expect(result).toHaveLength(0);
    });
  });

  describe("getLatest", () => {
    it("returns the latest temperature record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const latestRecord = createTestTemperatureRecord({ temperatureCelsius: 37.2 });
      prismaMock.temperatureRecord.findFirst.mockResolvedValue(latestRecord as never);

      const result = await caller.getLatest({ childId });

      expect(result).toBeDefined();
      expect(result?.temperatureCelsius).toBe(37.2);
      expect(prismaMock.temperatureRecord.findFirst).toHaveBeenCalledWith({
        where: { childId },
        orderBy: { time: "desc" },
      });
    });

    it("returns null when no records exist", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.temperatureRecord.findFirst.mockResolvedValue(null);

      const result = await caller.getLatest({ childId });

      expect(result).toBeNull();
    });
  });

  describe("log", () => {
    it("creates a new temperature record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const time = new Date();
      const temperatureData = {
        childId,
        time,
        temperatureCelsius: 38.0,
      };

      prismaMock.temperatureRecord.create.mockResolvedValue(
        createTestTemperatureRecord({ ...temperatureData }) as never
      );

      const result = await caller.log(temperatureData);

      expect(result).toBeDefined();
      expect(result.temperatureCelsius).toBe(38.0);
      expect(prismaMock.temperatureRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          childId,
          time,
          temperatureCelsius: 38.0,
        }),
      });
    });

    it("creates record with notes", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const temperatureData = {
        childId,
        time: new Date(),
        temperatureCelsius: 39.5,
        notes: "High fever, gave Tylenol",
      };

      prismaMock.temperatureRecord.create.mockResolvedValue(
        createTestTemperatureRecord({ ...temperatureData }) as never
      );

      const result = await caller.log(temperatureData);

      expect(prismaMock.temperatureRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          notes: "High fever, gave Tylenol",
        }),
      });
    });

    it("throws FORBIDDEN for VIEWER role", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "VIEWER" }) as never
      );

      await expect(
        caller.log({
          childId,
          time: new Date(),
          temperatureCelsius: 37.0,
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("update", () => {
    it("updates a temperature record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.temperatureRecord.update.mockResolvedValue(
        createTestTemperatureRecord({ temperatureCelsius: 36.5 }) as never
      );

      const result = await caller.update({
        id: recordId,
        temperatureCelsius: 36.5,
      });

      expect(result.temperatureCelsius).toBe(36.5);
      expect(prismaMock.temperatureRecord.update).toHaveBeenCalledWith({
        where: { id: recordId },
        data: expect.objectContaining({
          temperatureCelsius: 36.5,
        }),
      });
    });

    it("updates time and notes", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const newTime = new Date();
      prismaMock.temperatureRecord.update.mockResolvedValue(
        createTestTemperatureRecord({ time: newTime, notes: "Updated note" }) as never
      );

      const result = await caller.update({
        id: recordId,
        time: newTime,
        notes: "Updated note",
      });

      expect(prismaMock.temperatureRecord.update).toHaveBeenCalledWith({
        where: { id: recordId },
        data: expect.objectContaining({
          time: newTime,
          notes: "Updated note",
        }),
      });
    });

    it("throws FORBIDDEN for VIEWER role", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "VIEWER" }) as never
      );

      await expect(
        caller.update({ id: recordId, temperatureCelsius: 37.0 })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("delete", () => {
    it("deletes a temperature record", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.temperatureRecord.delete.mockResolvedValue(
        createTestTemperatureRecord() as never
      );

      const result = await caller.delete({ id: recordId });

      expect(result).toEqual({ success: true });
      expect(prismaMock.temperatureRecord.delete).toHaveBeenCalledWith({
        where: { id: recordId },
      });
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
});
