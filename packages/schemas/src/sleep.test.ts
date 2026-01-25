import { describe, it, expect } from "vitest";
import {
  sleepTypeSchema,
  qualitySchema,
  startSleepSchema,
  endSleepSchema,
  logSleepSchema,
  updateSleepSchema,
  deleteSleepSchema,
  getSleepRecordsSchema,
  getActiveSleepSchema,
  sleepSummarySchema,
} from "./sleep";

const validChildId = "cljk2j3k40000a1b2c3d4e5f6";
const validRecordId = "cljk2j3k40001a1b2c3d4e5f7";

describe("sleepTypeSchema", () => {
  it("accepts NAP", () => {
    expect(sleepTypeSchema.parse("NAP")).toBe("NAP");
  });

  it("accepts NIGHT", () => {
    expect(sleepTypeSchema.parse("NIGHT")).toBe("NIGHT");
  });

  it("rejects invalid types", () => {
    expect(() => sleepTypeSchema.parse("INVALID")).toThrow();
    expect(() => sleepTypeSchema.parse("nap")).toThrow(); // case sensitive
  });
});

describe("qualitySchema", () => {
  it("accepts values 1-5", () => {
    expect(qualitySchema.parse(1)).toBe(1);
    expect(qualitySchema.parse(3)).toBe(3);
    expect(qualitySchema.parse(5)).toBe(5);
  });

  it("rejects values below 1", () => {
    expect(() => qualitySchema.parse(0)).toThrow();
  });

  it("rejects values above 5", () => {
    expect(() => qualitySchema.parse(6)).toThrow();
  });
});

describe("startSleepSchema", () => {
  it("accepts minimal input with defaults", () => {
    const result = startSleepSchema.parse({ childId: validChildId });
    expect(result.childId).toBe(validChildId);
    expect(result.sleepType).toBe("NAP");
  });

  it("accepts full input", () => {
    const now = new Date();
    const result = startSleepSchema.parse({
      childId: validChildId,
      sleepType: "NIGHT",
      startTime: now,
    });
    expect(result.sleepType).toBe("NIGHT");
    expect(result.startTime).toEqual(now);
  });

  it("coerces date strings", () => {
    const result = startSleepSchema.parse({
      childId: validChildId,
      startTime: "2024-01-15T10:00:00Z",
    });
    expect(result.startTime).toBeInstanceOf(Date);
  });
});

describe("endSleepSchema", () => {
  it("accepts minimal input", () => {
    const result = endSleepSchema.parse({ id: validRecordId });
    expect(result.id).toBe(validRecordId);
  });

  it("accepts full input", () => {
    const result = endSleepSchema.parse({
      id: validRecordId,
      endTime: new Date(),
      quality: 4,
      notes: "Good sleep",
    });
    expect(result.quality).toBe(4);
    expect(result.notes).toBe("Good sleep");
  });

  it("rejects notes over 500 characters", () => {
    expect(() =>
      endSleepSchema.parse({
        id: validRecordId,
        notes: "a".repeat(501),
      })
    ).toThrow();
  });
});

describe("logSleepSchema", () => {
  it("accepts valid input", () => {
    const result = logSleepSchema.parse({
      childId: validChildId,
      startTime: new Date("2024-01-15T10:00:00"),
      endTime: new Date("2024-01-15T12:00:00"),
    });
    expect(result.sleepType).toBe("NAP"); // default
  });

  it("requires startTime and endTime", () => {
    expect(() =>
      logSleepSchema.parse({
        childId: validChildId,
        startTime: new Date(),
      })
    ).toThrow();
  });

  it("accepts optional fields", () => {
    const result = logSleepSchema.parse({
      childId: validChildId,
      startTime: new Date(),
      endTime: new Date(),
      sleepType: "NIGHT",
      quality: 5,
      notes: "Deep sleep",
    });
    expect(result.sleepType).toBe("NIGHT");
    expect(result.quality).toBe(5);
  });
});

describe("updateSleepSchema", () => {
  it("accepts minimal input", () => {
    const result = updateSleepSchema.parse({ id: validRecordId });
    expect(result.id).toBe(validRecordId);
  });

  it("accepts nullable fields", () => {
    const result = updateSleepSchema.parse({
      id: validRecordId,
      endTime: null,
      quality: null,
      notes: null,
    });
    expect(result.endTime).toBeNull();
    expect(result.quality).toBeNull();
  });
});

describe("deleteSleepSchema", () => {
  it("requires id", () => {
    expect(() => deleteSleepSchema.parse({})).toThrow();
  });

  it("accepts valid id", () => {
    const result = deleteSleepSchema.parse({ id: validRecordId });
    expect(result.id).toBe(validRecordId);
  });
});

describe("getSleepRecordsSchema", () => {
  it("requires childId", () => {
    expect(() => getSleepRecordsSchema.parse({})).toThrow();
  });

  it("accepts period filter", () => {
    const result = getSleepRecordsSchema.parse({
      childId: validChildId,
      period: "week",
    });
    expect(result.period).toBe("week");
  });

  it("accepts dateRange filter", () => {
    const result = getSleepRecordsSchema.parse({
      childId: validChildId,
      dateRange: {
        start: "2024-01-01",
        end: "2024-01-31",
      },
    });
    expect(result.dateRange?.start).toBeInstanceOf(Date);
  });
});

describe("getActiveSleepSchema", () => {
  it("requires childId", () => {
    const result = getActiveSleepSchema.parse({ childId: validChildId });
    expect(result.childId).toBe(validChildId);
  });
});

describe("sleepSummarySchema", () => {
  it("uses default period of today", () => {
    const result = sleepSummarySchema.parse({ childId: validChildId });
    expect(result.period).toBe("today");
  });

  it("accepts custom period", () => {
    const result = sleepSummarySchema.parse({
      childId: validChildId,
      period: "month",
    });
    expect(result.period).toBe("month");
  });
});
