import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@finnberry/db";
import { handleSleepTools } from "./sleep.js";
import { handlePumpingTools } from "./pumping.js";
import { handleActivityTools } from "./activity.js";
import { handleMedicineTools } from "./medicine.js";

const CHILD_ID = "child-1";
const endedRecord = {
  id: "record-1",
  startTime: new Date("2024-01-15T10:00:00Z"),
  endTime: new Date("2024-01-15T11:00:00Z"),
};

function fakePrisma() {
  return {
    sleepRecord: { update: vi.fn().mockResolvedValue(endedRecord) },
    pumpingRecord: { update: vi.fn().mockResolvedValue(endedRecord) },
    activityRecord: { update: vi.fn().mockResolvedValue(endedRecord) },
    medicine: { findUnique: vi.fn().mockResolvedValue(null) },
    medicineRecord: { create: vi.fn(), findMany: vi.fn() },
  };
}

const asClient = (prisma: ReturnType<typeof fakePrisma>) =>
  prisma as unknown as PrismaClient;

describe("tools that end a record by id", () => {
  const cases = [
    { tool: "end-sleep", handle: handleSleepTools, idKey: "sleepId", model: "sleepRecord" },
    { tool: "end-pumping", handle: handlePumpingTools, idKey: "pumpingId", model: "pumpingRecord" },
    { tool: "end-activity", handle: handleActivityTools, idKey: "activityId", model: "activityRecord" },
  ] as const;

  it.each(cases)("$tool only matches a record of the given child", async ({ tool, handle, idKey, model }) => {
    const prisma = fakePrisma();

    await handle(tool, { childId: CHILD_ID, [idKey]: "record-1" }, asClient(prisma));

    expect(prisma[model].update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "record-1", childId: CHILD_ID } })
    );
  });

  it.each(cases)("$tool refuses to run without a childId", async ({ tool, handle, idKey, model }) => {
    const prisma = fakePrisma();

    await expect(
      handle(tool, { [idKey]: "record-1" }, asClient(prisma))
    ).rejects.toThrow("childId is required");
    expect(prisma[model].update).not.toHaveBeenCalled();
  });
});

describe("medicine tools addressed by medicineId", () => {
  it.each(["log-medicine", "get-medicine-records"])(
    "%s looks the medicine up under the given child",
    async (tool) => {
      const prisma = fakePrisma();

      // The fake finds no medicine, as the database would for another child's.
      await expect(
        handleMedicineTools(tool, { childId: CHILD_ID, medicineId: "med-1" }, asClient(prisma))
      ).rejects.toThrow("Medicine not found");

      expect(prisma.medicine.findUnique).toHaveBeenCalledWith({
        where: { id: "med-1", childId: CHILD_ID },
      });
      expect(prisma.medicineRecord.create).not.toHaveBeenCalled();
      expect(prisma.medicineRecord.findMany).not.toHaveBeenCalled();
    }
  );

  it.each(["log-medicine", "get-medicine-records"])(
    "%s refuses to run without a childId",
    async (tool) => {
      const prisma = fakePrisma();

      await expect(
        handleMedicineTools(tool, { medicineId: "med-1" }, asClient(prisma))
      ).rejects.toThrow("childId is required");
      expect(prisma.medicine.findUnique).not.toHaveBeenCalled();
    }
  );
});
