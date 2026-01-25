import { describe, it, expect } from "vitest";
import {
  startPumpingSchema,
  endPumpingSchema,
  logPumpingSchema,
  updatePumpingSchema,
  deletePumpingSchema,
  getPumpingRecordsSchema,
  pumpingSummarySchema,
} from "./pumping";

const validChildId = "cljk2j3k40000a1b2c3d4e5f6";
const validRecordId = "cljk2j3k40001a1b2c3d4e5f7";

describe("startPumpingSchema", () => {
  it("requires childId", () => {
    expect(() => startPumpingSchema.parse({})).toThrow();
  });

  it("accepts minimal input", () => {
    const result = startPumpingSchema.parse({ childId: validChildId });
    expect(result.childId).toBe(validChildId);
  });

  it("accepts optional side", () => {
    const result = startPumpingSchema.parse({
      childId: validChildId,
      side: "LEFT",
    });
    expect(result.side).toBe("LEFT");
  });

  it("accepts optional startTime", () => {
    const now = new Date();
    const result = startPumpingSchema.parse({
      childId: validChildId,
      startTime: now,
    });
    expect(result.startTime).toEqual(now);
  });
});

describe("endPumpingSchema", () => {
  it("requires id", () => {
    expect(() => endPumpingSchema.parse({})).toThrow();
  });

  it("accepts minimal input", () => {
    const result = endPumpingSchema.parse({ id: validRecordId });
    expect(result.id).toBe(validRecordId);
  });

  it("accepts optional amountMl", () => {
    const result = endPumpingSchema.parse({
      id: validRecordId,
      amountMl: 150,
    });
    expect(result.amountMl).toBe(150);
  });

  it("validates amountMl range", () => {
    expect(() =>
      endPumpingSchema.parse({
        id: validRecordId,
        amountMl: -10,
      })
    ).toThrow();

    expect(() =>
      endPumpingSchema.parse({
        id: validRecordId,
        amountMl: 600,
      })
    ).toThrow();
  });
});

describe("logPumpingSchema", () => {
  it("requires childId and startTime", () => {
    expect(() =>
      logPumpingSchema.parse({ childId: validChildId })
    ).toThrow();
  });

  it("accepts valid input", () => {
    const result = logPumpingSchema.parse({
      childId: validChildId,
      startTime: new Date(),
    });
    expect(result.childId).toBe(validChildId);
  });

  it("accepts all optional fields", () => {
    const result = logPumpingSchema.parse({
      childId: validChildId,
      startTime: new Date(),
      endTime: new Date(),
      amountMl: 100,
      side: "BOTH",
      notes: "Good session",
    });
    expect(result.amountMl).toBe(100);
    expect(result.side).toBe("BOTH");
  });
});

describe("updatePumpingSchema", () => {
  it("requires id", () => {
    expect(() => updatePumpingSchema.parse({})).toThrow();
  });

  it("accepts nullable fields", () => {
    const result = updatePumpingSchema.parse({
      id: validRecordId,
      endTime: null,
      amountMl: null,
      side: null,
      notes: null,
    });
    expect(result.endTime).toBeNull();
  });
});

describe("deletePumpingSchema", () => {
  it("requires valid id", () => {
    const result = deletePumpingSchema.parse({ id: validRecordId });
    expect(result.id).toBe(validRecordId);
  });
});

describe("getPumpingRecordsSchema", () => {
  it("requires childId", () => {
    expect(() => getPumpingRecordsSchema.parse({})).toThrow();
  });

  it("accepts period filter", () => {
    const result = getPumpingRecordsSchema.parse({
      childId: validChildId,
      period: "week",
    });
    expect(result.period).toBe("week");
  });
});

describe("pumpingSummarySchema", () => {
  it("uses default period", () => {
    const result = pumpingSummarySchema.parse({ childId: validChildId });
    expect(result.period).toBe("today");
  });
});
