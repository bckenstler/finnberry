import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../test/setup";
import {
  createTestChild,
  createTestContext,
  mockMemberships,
  mockRecordOwnership,
  TEST_IDS,
} from "../test/helpers";
import { createCallerFactory } from "../trpc";
import { appRouter } from "../root";

const createCaller = createCallerFactory(appRouter);

const VICTIM_HOUSEHOLD_ID = "clq1234567890abcdefghij99";
const VICTIM_CHILD_ID = "clq1234567890abcdefghij98";

// The caller owns TEST_IDS.householdId and is not a member of the victim
// household. Every resource below belongs to the victim household.
describe("access to another household's data", () => {
  beforeEach(() => {
    mockMemberships([{ role: "OWNER" }]);
    mockRecordOwnership(VICTIM_HOUSEHOLD_ID);
    // Only the child's own id finds the child. A lookup that treats a record
    // id as a child id must come back empty, as it would in the database.
    prismaMock.child.findUnique.mockImplementation(((args: { where: { id: string } }) =>
      Promise.resolve(
        args.where.id === VICTIM_CHILD_ID
          ? createTestChild({ id: VICTIM_CHILD_ID, householdId: VICTIM_HOUSEHOLD_ID })
          : null
      )) as never);
    prismaMock.household.findUnique.mockResolvedValue(null);
  });

  describe("naming the caller's own household alongside the target", () => {
    const ownHousehold = { householdId: TEST_IDS.householdId };

    it("does not delete the other household", async () => {
      const caller = createCaller(createTestContext());

      await expect(
        caller.household.delete({ id: VICTIM_HOUSEHOLD_ID, ...ownHousehold } as never)
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(prismaMock.household.delete).not.toHaveBeenCalled();
    });

    it("does not update the other household's child", async () => {
      const caller = createCaller(createTestContext());

      await expect(
        caller.child.update({ id: VICTIM_CHILD_ID, name: "Renamed", ...ownHousehold } as never)
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(prismaMock.child.update).not.toHaveBeenCalled();
    });

    it("does not read the other household's timeline", async () => {
      const caller = createCaller(createTestContext());

      await expect(
        caller.sleep.list({ childId: VICTIM_CHILD_ID, ...ownHousehold } as never)
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(prismaMock.sleepRecord.findMany).not.toHaveBeenCalled();
    });
  });

  describe("addressing a record by its id alone", () => {
    it("does not update the other household's sleep record", async () => {
      const caller = createCaller(createTestContext());

      await expect(
        caller.sleep.update({ id: TEST_IDS.sleepId, notes: "tampered" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(prismaMock.sleepRecord.update).not.toHaveBeenCalled();
    });

    it("does not delete the other household's diaper record", async () => {
      const caller = createCaller(createTestContext());

      await expect(
        caller.diaper.delete({ id: TEST_IDS.diaperId })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(prismaMock.diaperRecord.delete).not.toHaveBeenCalled();
    });

    it("does not read the other household's medicine", async () => {
      const caller = createCaller(createTestContext());

      await expect(
        caller.medicine.get({ id: TEST_IDS.medicineId })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("does not read the other household's medicine records", async () => {
      const caller = createCaller(createTestContext());

      await expect(
        caller.medicine.getRecords({ medicineId: TEST_IDS.medicineId })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(prismaMock.medicineRecord.findMany).not.toHaveBeenCalled();
    });

    it("does not log a dose against the other household's medicine", async () => {
      const caller = createCaller(createTestContext());

      await expect(
        caller.medicine.logRecord({ medicineId: TEST_IDS.medicineId })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(prismaMock.medicineRecord.create).not.toHaveBeenCalled();
    });

    it("does not delete the other household's medicine record", async () => {
      const caller = createCaller(createTestContext());

      await expect(
        caller.medicine.deleteRecord({ id: TEST_IDS.recordId })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(prismaMock.medicineRecord.delete).not.toHaveBeenCalled();
    });

    it("reports a record that does not exist as NOT_FOUND", async () => {
      const caller = createCaller(createTestContext());
      prismaMock.sleepRecord.findUnique.mockResolvedValue(null);

      await expect(
        caller.sleep.delete({ id: TEST_IDS.sleepId })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(prismaMock.sleepRecord.delete).not.toHaveBeenCalled();
    });
  });

  it("does not let a VIEWER edit a record in their own household", async () => {
    const caller = createCaller(createTestContext());
    mockMemberships([{ role: "VIEWER" }]);
    mockRecordOwnership();

    await expect(
      caller.sleep.update({ id: TEST_IDS.sleepId, notes: "edited" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(prismaMock.sleepRecord.update).not.toHaveBeenCalled();
  });
});
