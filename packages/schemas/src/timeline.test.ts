import { describe, it, expect } from "vitest";
import {
  getLastActivitiesSchema,
  getDayTimelineSchema,
  getWeekTimelineSchema,
  getListTimelineSchema,
  timelineActivityTypeSchema,
} from "./timeline";

const validChildId = "cljk2j3k40000a1b2c3d4e5f6";

describe("getLastActivitiesSchema", () => {
  it("accepts valid childId", () => {
    const result = getLastActivitiesSchema.parse({ childId: validChildId });
    expect(result.childId).toBe(validChildId);
  });

  it("rejects missing childId", () => {
    expect(() => getLastActivitiesSchema.parse({})).toThrow();
  });

  it("rejects invalid childId format", () => {
    expect(() => getLastActivitiesSchema.parse({ childId: "invalid" })).toThrow();
  });
});

describe("getDayTimelineSchema", () => {
  it("accepts valid input", () => {
    const date = new Date("2024-01-15");
    const result = getDayTimelineSchema.parse({
      childId: validChildId,
      date,
    });
    expect(result.childId).toBe(validChildId);
    expect(result.date).toEqual(date);
  });

  it("coerces date strings", () => {
    const result = getDayTimelineSchema.parse({
      childId: validChildId,
      date: "2024-01-15",
    });
    expect(result.date).toBeInstanceOf(Date);
  });

  it("rejects missing childId", () => {
    expect(() =>
      getDayTimelineSchema.parse({ date: new Date() })
    ).toThrow();
  });

  it("rejects missing date", () => {
    expect(() =>
      getDayTimelineSchema.parse({ childId: validChildId })
    ).toThrow();
  });
});

describe("getWeekTimelineSchema", () => {
  it("accepts valid input", () => {
    const weekStart = new Date("2024-01-15");
    const result = getWeekTimelineSchema.parse({
      childId: validChildId,
      weekStart,
    });
    expect(result.childId).toBe(validChildId);
    expect(result.weekStart).toEqual(weekStart);
  });

  it("coerces date strings", () => {
    const result = getWeekTimelineSchema.parse({
      childId: validChildId,
      weekStart: "2024-01-15",
    });
    expect(result.weekStart).toBeInstanceOf(Date);
  });

  it("rejects missing childId", () => {
    expect(() =>
      getWeekTimelineSchema.parse({ weekStart: new Date() })
    ).toThrow();
  });

  it("rejects missing weekStart", () => {
    expect(() =>
      getWeekTimelineSchema.parse({ childId: validChildId })
    ).toThrow();
  });
});

describe("getListTimelineSchema", () => {
  it("accepts valid input", () => {
    const weekStart = new Date("2024-01-15");
    const result = getListTimelineSchema.parse({
      childId: validChildId,
      weekStart,
    });
    expect(result.childId).toBe(validChildId);
    expect(result.weekStart).toEqual(weekStart);
  });

  it("coerces date strings", () => {
    const result = getListTimelineSchema.parse({
      childId: validChildId,
      weekStart: "2024-01-15",
    });
    expect(result.weekStart).toBeInstanceOf(Date);
  });

  it("rejects missing childId", () => {
    expect(() =>
      getListTimelineSchema.parse({ weekStart: new Date() })
    ).toThrow();
  });

  it("rejects missing weekStart", () => {
    expect(() =>
      getListTimelineSchema.parse({ childId: validChildId })
    ).toThrow();
  });
});

describe("timelineActivityTypeSchema", () => {
  it("accepts SLEEP", () => {
    expect(timelineActivityTypeSchema.parse("SLEEP")).toBe("SLEEP");
  });

  it("accepts BREAST", () => {
    expect(timelineActivityTypeSchema.parse("BREAST")).toBe("BREAST");
  });

  it("accepts BOTTLE", () => {
    expect(timelineActivityTypeSchema.parse("BOTTLE")).toBe("BOTTLE");
  });

  it("accepts SOLIDS", () => {
    expect(timelineActivityTypeSchema.parse("SOLIDS")).toBe("SOLIDS");
  });

  it("accepts DIAPER", () => {
    expect(timelineActivityTypeSchema.parse("DIAPER")).toBe("DIAPER");
  });

  it("rejects invalid types", () => {
    expect(() => timelineActivityTypeSchema.parse("INVALID")).toThrow();
    expect(() => timelineActivityTypeSchema.parse("sleep")).toThrow(); // case sensitive
  });
});
