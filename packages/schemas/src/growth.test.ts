import { describe, it, expect } from "vitest";
import {
  logGrowthSchema,
  updateGrowthSchema,
  deleteGrowthSchema,
  getGrowthRecordsSchema,
  getLatestGrowthSchema,
} from "./growth";

const validChildId = "cljk2j3k40000a1b2c3d4e5f6";
const validRecordId = "cljk2j3k40001a1b2c3d4e5f7";

describe("logGrowthSchema", () => {
  it("requires childId and date", () => {
    expect(() =>
      logGrowthSchema.parse({ childId: validChildId })
    ).toThrow();
  });

  it("accepts minimal input", () => {
    const result = logGrowthSchema.parse({
      childId: validChildId,
      date: new Date(),
    });
    expect(result.childId).toBe(validChildId);
  });

  it("accepts weight measurement", () => {
    const result = logGrowthSchema.parse({
      childId: validChildId,
      date: new Date(),
      weightKg: 5.5,
    });
    expect(result.weightKg).toBe(5.5);
  });

  it("validates weight range", () => {
    expect(() =>
      logGrowthSchema.parse({
        childId: validChildId,
        date: new Date(),
        weightKg: -1,
      })
    ).toThrow();

    expect(() =>
      logGrowthSchema.parse({
        childId: validChildId,
        date: new Date(),
        weightKg: 60,
      })
    ).toThrow();
  });

  it("accepts height measurement", () => {
    const result = logGrowthSchema.parse({
      childId: validChildId,
      date: new Date(),
      heightCm: 65,
    });
    expect(result.heightCm).toBe(65);
  });

  it("validates height range", () => {
    expect(() =>
      logGrowthSchema.parse({
        childId: validChildId,
        date: new Date(),
        heightCm: -1,
      })
    ).toThrow();

    expect(() =>
      logGrowthSchema.parse({
        childId: validChildId,
        date: new Date(),
        heightCm: 250,
      })
    ).toThrow();
  });

  it("accepts head circumference", () => {
    const result = logGrowthSchema.parse({
      childId: validChildId,
      date: new Date(),
      headCircumferenceCm: 40,
    });
    expect(result.headCircumferenceCm).toBe(40);
  });

  it("validates head circumference range", () => {
    expect(() =>
      logGrowthSchema.parse({
        childId: validChildId,
        date: new Date(),
        headCircumferenceCm: 150,
      })
    ).toThrow();
  });

  it("accepts all measurements together", () => {
    const result = logGrowthSchema.parse({
      childId: validChildId,
      date: new Date(),
      weightKg: 7.5,
      heightCm: 70,
      headCircumferenceCm: 42,
      notes: "Regular checkup",
    });
    expect(result.weightKg).toBe(7.5);
    expect(result.heightCm).toBe(70);
    expect(result.headCircumferenceCm).toBe(42);
  });
});

describe("updateGrowthSchema", () => {
  it("requires id", () => {
    expect(() => updateGrowthSchema.parse({})).toThrow();
  });

  it("accepts partial update", () => {
    const result = updateGrowthSchema.parse({
      id: validRecordId,
      weightKg: 8.0,
    });
    expect(result.weightKg).toBe(8.0);
  });

  it("accepts nullable fields", () => {
    const result = updateGrowthSchema.parse({
      id: validRecordId,
      weightKg: null,
      heightCm: null,
      headCircumferenceCm: null,
      notes: null,
    });
    expect(result.weightKg).toBeNull();
  });
});

describe("deleteGrowthSchema", () => {
  it("requires valid id", () => {
    const result = deleteGrowthSchema.parse({ id: validRecordId });
    expect(result.id).toBe(validRecordId);
  });
});

describe("getGrowthRecordsSchema", () => {
  it("requires childId", () => {
    expect(() => getGrowthRecordsSchema.parse({})).toThrow();
  });

  it("accepts dateRange filter", () => {
    const result = getGrowthRecordsSchema.parse({
      childId: validChildId,
      dateRange: {
        start: "2024-01-01",
        end: "2024-12-31",
      },
    });
    expect(result.dateRange?.start).toBeInstanceOf(Date);
  });
});

describe("getLatestGrowthSchema", () => {
  it("requires childId", () => {
    const result = getLatestGrowthSchema.parse({ childId: validChildId });
    expect(result.childId).toBe(validChildId);
  });
});
