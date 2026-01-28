import { describe, it, expect } from "vitest";
import {
  logTemperatureSchema,
  updateTemperatureSchema,
  deleteTemperatureSchema,
  getTemperatureRecordsSchema,
  getLatestTemperatureSchema,
} from "./temperature";

const validChildId = "cljk2j3k40000a1b2c3d4e5f6";
const validRecordId = "cljk2j3k40001a1b2c3d4e5f7";

describe("logTemperatureSchema", () => {
  it("accepts valid input with required fields", () => {
    const now = new Date();
    const result = logTemperatureSchema.parse({
      childId: validChildId,
      time: now,
      temperatureCelsius: 37.0,
    });

    expect(result.childId).toBe(validChildId);
    expect(result.time).toEqual(now);
    expect(result.temperatureCelsius).toBe(37.0);
    expect(result.notes).toBeUndefined();
  });

  it("accepts valid input with optional notes", () => {
    const result = logTemperatureSchema.parse({
      childId: validChildId,
      time: new Date(),
      temperatureCelsius: 38.5,
      notes: "Slight fever",
    });

    expect(result.notes).toBe("Slight fever");
  });

  it("coerces date strings", () => {
    const result = logTemperatureSchema.parse({
      childId: validChildId,
      time: "2024-01-15T10:00:00Z",
      temperatureCelsius: 36.5,
    });

    expect(result.time).toBeInstanceOf(Date);
  });

  it("rejects temperature below 30", () => {
    expect(() =>
      logTemperatureSchema.parse({
        childId: validChildId,
        time: new Date(),
        temperatureCelsius: 29.9,
      })
    ).toThrow();
  });

  it("rejects temperature above 45", () => {
    expect(() =>
      logTemperatureSchema.parse({
        childId: validChildId,
        time: new Date(),
        temperatureCelsius: 45.1,
      })
    ).toThrow();
  });

  it("accepts boundary temperatures", () => {
    expect(
      logTemperatureSchema.parse({
        childId: validChildId,
        time: new Date(),
        temperatureCelsius: 30,
      }).temperatureCelsius
    ).toBe(30);

    expect(
      logTemperatureSchema.parse({
        childId: validChildId,
        time: new Date(),
        temperatureCelsius: 45,
      }).temperatureCelsius
    ).toBe(45);
  });

  it("rejects notes over 500 characters", () => {
    expect(() =>
      logTemperatureSchema.parse({
        childId: validChildId,
        time: new Date(),
        temperatureCelsius: 37.0,
        notes: "a".repeat(501),
      })
    ).toThrow();
  });

  it("accepts notes at exactly 500 characters", () => {
    const result = logTemperatureSchema.parse({
      childId: validChildId,
      time: new Date(),
      temperatureCelsius: 37.0,
      notes: "a".repeat(500),
    });

    expect(result.notes?.length).toBe(500);
  });

  it("requires childId", () => {
    expect(() =>
      logTemperatureSchema.parse({
        time: new Date(),
        temperatureCelsius: 37.0,
      })
    ).toThrow();
  });

  it("requires time", () => {
    expect(() =>
      logTemperatureSchema.parse({
        childId: validChildId,
        temperatureCelsius: 37.0,
      })
    ).toThrow();
  });

  it("requires temperatureCelsius", () => {
    expect(() =>
      logTemperatureSchema.parse({
        childId: validChildId,
        time: new Date(),
      })
    ).toThrow();
  });
});

describe("updateTemperatureSchema", () => {
  it("accepts minimal input with only id", () => {
    const result = updateTemperatureSchema.parse({ id: validRecordId });
    expect(result.id).toBe(validRecordId);
    expect(result.time).toBeUndefined();
    expect(result.temperatureCelsius).toBeUndefined();
    expect(result.notes).toBeUndefined();
  });

  it("accepts all optional fields", () => {
    const now = new Date();
    const result = updateTemperatureSchema.parse({
      id: validRecordId,
      time: now,
      temperatureCelsius: 36.8,
      notes: "After medication",
    });

    expect(result.time).toEqual(now);
    expect(result.temperatureCelsius).toBe(36.8);
    expect(result.notes).toBe("After medication");
  });

  it("accepts nullable notes", () => {
    const result = updateTemperatureSchema.parse({
      id: validRecordId,
      notes: null,
    });

    expect(result.notes).toBeNull();
  });

  it("validates temperature range on update", () => {
    expect(() =>
      updateTemperatureSchema.parse({
        id: validRecordId,
        temperatureCelsius: 25.0,
      })
    ).toThrow();

    expect(() =>
      updateTemperatureSchema.parse({
        id: validRecordId,
        temperatureCelsius: 50.0,
      })
    ).toThrow();
  });

  it("requires id", () => {
    expect(() =>
      updateTemperatureSchema.parse({
        temperatureCelsius: 37.0,
      })
    ).toThrow();
  });
});

describe("deleteTemperatureSchema", () => {
  it("requires id", () => {
    expect(() => deleteTemperatureSchema.parse({})).toThrow();
  });

  it("accepts valid id", () => {
    const result = deleteTemperatureSchema.parse({ id: validRecordId });
    expect(result.id).toBe(validRecordId);
  });
});

describe("getTemperatureRecordsSchema", () => {
  it("requires childId", () => {
    expect(() => getTemperatureRecordsSchema.parse({})).toThrow();
  });

  it("accepts childId only", () => {
    const result = getTemperatureRecordsSchema.parse({ childId: validChildId });
    expect(result.childId).toBe(validChildId);
    expect(result.dateRange).toBeUndefined();
  });

  it("accepts dateRange filter", () => {
    const result = getTemperatureRecordsSchema.parse({
      childId: validChildId,
      dateRange: {
        start: "2024-01-01",
        end: "2024-01-31",
      },
    });

    expect(result.dateRange?.start).toBeInstanceOf(Date);
    expect(result.dateRange?.end).toBeInstanceOf(Date);
  });
});

describe("getLatestTemperatureSchema", () => {
  it("requires childId", () => {
    expect(() => getLatestTemperatureSchema.parse({})).toThrow();
  });

  it("accepts valid childId", () => {
    const result = getLatestTemperatureSchema.parse({ childId: validChildId });
    expect(result.childId).toBe(validChildId);
  });
});
