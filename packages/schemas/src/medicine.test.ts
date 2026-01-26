import { describe, it, expect } from "vitest";
import {
  createMedicineSchema,
  updateMedicineSchema,
  deleteMedicineSchema,
  getMedicinesSchema,
  logMedicineRecordSchema,
  updateMedicineRecordSchema,
  deleteMedicineRecordSchema,
  getMedicineRecordsSchema,
} from "./medicine";

const validChildId = "cljk2j3k40000a1b2c3d4e5f6";
const validMedicineId = "cljk2j3k40001a1b2c3d4e5f7";
const validRecordId = "cljk2j3k40002a1b2c3d4e5f8";

describe("createMedicineSchema", () => {
  it("requires childId, name, and dosage", () => {
    expect(() =>
      createMedicineSchema.parse({
        childId: validChildId,
        name: "Vitamin D",
      })
    ).toThrow();
  });

  it("accepts valid input", () => {
    const result = createMedicineSchema.parse({
      childId: validChildId,
      name: "Vitamin D",
      dosage: "400 IU",
    });
    expect(result.name).toBe("Vitamin D");
    expect(result.dosage).toBe("400 IU");
  });

  it("accepts optional frequency and notes", () => {
    const result = createMedicineSchema.parse({
      childId: validChildId,
      name: "Vitamin D",
      dosage: "400 IU",
      frequency: "Once daily",
      notes: "Give with food",
    });
    expect(result.frequency).toBe("Once daily");
  });

  it("rejects empty name", () => {
    expect(() =>
      createMedicineSchema.parse({
        childId: validChildId,
        name: "",
        dosage: "400 IU",
      })
    ).toThrow();
  });

  it("rejects name over 100 characters", () => {
    expect(() =>
      createMedicineSchema.parse({
        childId: validChildId,
        name: "a".repeat(101),
        dosage: "400 IU",
      })
    ).toThrow();
  });

  it("rejects dosage over 100 characters", () => {
    expect(() =>
      createMedicineSchema.parse({
        childId: validChildId,
        name: "Vitamin D",
        dosage: "a".repeat(101),
      })
    ).toThrow();
  });
});

describe("updateMedicineSchema", () => {
  it("requires id", () => {
    expect(() => updateMedicineSchema.parse({})).toThrow();
  });

  it("accepts partial update", () => {
    const result = updateMedicineSchema.parse({
      id: validMedicineId,
      name: "New Name",
    });
    expect(result.name).toBe("New Name");
  });

  it("accepts isActive update", () => {
    const result = updateMedicineSchema.parse({
      id: validMedicineId,
      isActive: false,
    });
    expect(result.isActive).toBe(false);
  });

  it("accepts nullable fields", () => {
    const result = updateMedicineSchema.parse({
      id: validMedicineId,
      frequency: null,
      notes: null,
    });
    expect(result.frequency).toBeNull();
  });
});

describe("deleteMedicineSchema", () => {
  it("requires valid id", () => {
    const result = deleteMedicineSchema.parse({ id: validMedicineId });
    expect(result.id).toBe(validMedicineId);
  });
});

describe("getMedicinesSchema", () => {
  it("requires childId", () => {
    expect(() => getMedicinesSchema.parse({})).toThrow();
  });

  it("uses default activeOnly true", () => {
    const result = getMedicinesSchema.parse({ childId: validChildId });
    expect(result.activeOnly).toBe(true);
  });

  it("accepts activeOnly false", () => {
    const result = getMedicinesSchema.parse({
      childId: validChildId,
      activeOnly: false,
    });
    expect(result.activeOnly).toBe(false);
  });
});

describe("logMedicineRecordSchema", () => {
  it("requires medicineId", () => {
    expect(() => logMedicineRecordSchema.parse({})).toThrow();
  });

  it("accepts minimal input", () => {
    const result = logMedicineRecordSchema.parse({
      medicineId: validMedicineId,
    });
    expect(result.medicineId).toBe(validMedicineId);
  });

  it("uses default skipped false", () => {
    const result = logMedicineRecordSchema.parse({
      medicineId: validMedicineId,
    });
    expect(result.skipped).toBe(false);
  });

  it("accepts skipped true", () => {
    const result = logMedicineRecordSchema.parse({
      medicineId: validMedicineId,
      skipped: true,
    });
    expect(result.skipped).toBe(true);
  });

  it("accepts optional fields", () => {
    const result = logMedicineRecordSchema.parse({
      medicineId: validMedicineId,
      time: new Date(),
      dosageGiven: "Half dose",
      notes: "Spit some out",
    });
    expect(result.dosageGiven).toBe("Half dose");
  });
});

describe("updateMedicineRecordSchema", () => {
  it("requires id", () => {
    expect(() => updateMedicineRecordSchema.parse({})).toThrow();
  });

  it("accepts partial update", () => {
    const result = updateMedicineRecordSchema.parse({
      id: validRecordId,
      skipped: true,
    });
    expect(result.skipped).toBe(true);
  });

  it("accepts nullable fields", () => {
    const result = updateMedicineRecordSchema.parse({
      id: validRecordId,
      dosageGiven: null,
      notes: null,
    });
    expect(result.dosageGiven).toBeNull();
  });
});

describe("deleteMedicineRecordSchema", () => {
  it("requires valid id", () => {
    const result = deleteMedicineRecordSchema.parse({ id: validRecordId });
    expect(result.id).toBe(validRecordId);
  });
});

describe("getMedicineRecordsSchema", () => {
  it("requires medicineId", () => {
    expect(() => getMedicineRecordsSchema.parse({})).toThrow();
  });

  it("accepts dateRange filter", () => {
    const result = getMedicineRecordsSchema.parse({
      medicineId: validMedicineId,
      dateRange: {
        start: "2024-01-01",
        end: "2024-12-31",
      },
    });
    expect(result.dateRange?.start).toBeInstanceOf(Date);
  });
});
