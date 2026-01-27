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
  it("requires childId, time, and temperature", () => {
    expect(() =>
      logTemperatureSchema.parse({ childId: validChildId })
    ).toThrow();

    expect(() =>
      logTemperatureSchema.parse({ childId: validChildId, time: new Date() })
    ).toThrow();
  });

  it("accepts minimal input", () => {
    const result = logTemperatureSchema.parse({
      childId: validChildId,
      time: new Date(),
      temperatureCelsius: 37.0,
    });
    expect(result.childId).toBe(validChildId);
    expect(result.temperatureCelsius).toBe(37.0);
  });

  it("validates temperature range", () => {
    // Too low
    expect(() =>
      logTemperatureSchema.parse({
        childId: validChildId,
        time: new Date(),
        temperatureCelsius: 25,
      })
    ).toThrow();

    // Too high
    expect(() =>
      logTemperatureSchema.parse({
        childId: validChildId,
        time: new Date(),
        temperatureCelsius: 50,
      })
    ).toThrow();
  });

  it("accepts valid temperature values", () => {
    // Normal temperature
    const normal = logTemperatureSchema.parse({
      childId: validChildId,
      time: new Date(),
      temperatureCelsius: 36.5,
    });
    expect(normal.temperatureCelsius).toBe(36.5);

    // Fever temperature
    const fever = logTemperatureSchema.parse({
      childId: validChildId,
      time: new Date(),
      temperatureCelsius: 39.5,
    });
    expect(fever.temperatureCelsius).toBe(39.5);
  });

  it("accepts notes", () => {
    const result = logTemperatureSchema.parse({
      childId: validChildId,
      time: new Date(),
      temperatureCelsius: 37.2,
      notes: "After feeding",
    });
    expect(result.notes).toBe("After feeding");
  });

  it("validates notes length", () => {
    expect(() =>
      logTemperatureSchema.parse({
        childId: validChildId,
        time: new Date(),
        temperatureCelsius: 37.0,
        notes: "a".repeat(501),
      })
    ).toThrow();
  });
});

describe("updateTemperatureSchema", () => {
  it("requires id", () => {
    expect(() => updateTemperatureSchema.parse({})).toThrow();
  });

  it("accepts partial update", () => {
    const result = updateTemperatureSchema.parse({
      id: validRecordId,
      temperatureCelsius: 38.0,
    });
    expect(result.temperatureCelsius).toBe(38.0);
  });

  it("accepts nullable notes", () => {
    const result = updateTemperatureSchema.parse({
      id: validRecordId,
      notes: null,
    });
    expect(result.notes).toBeNull();
  });
});

describe("deleteTemperatureSchema", () => {
  it("requires valid id", () => {
    const result = deleteTemperatureSchema.parse({ id: validRecordId });
    expect(result.id).toBe(validRecordId);
  });
});

describe("getTemperatureRecordsSchema", () => {
  it("requires childId", () => {
    expect(() => getTemperatureRecordsSchema.parse({})).toThrow();
  });

  it("accepts dateRange filter", () => {
    const result = getTemperatureRecordsSchema.parse({
      childId: validChildId,
      dateRange: {
        start: "2024-01-01",
        end: "2024-12-31",
      },
    });
    expect(result.dateRange?.start).toBeInstanceOf(Date);
  });
});

describe("getLatestTemperatureSchema", () => {
  it("requires childId", () => {
    const result = getLatestTemperatureSchema.parse({ childId: validChildId });
    expect(result.childId).toBe(validChildId);
  });
});
