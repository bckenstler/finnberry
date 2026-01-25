import { describe, it, expect } from "vitest";
import {
  activityTypeSchema,
  startActivitySchema,
  endActivitySchema,
  logActivitySchema,
  updateActivitySchema,
  deleteActivitySchema,
  getActivityRecordsSchema,
  activitySummarySchema,
} from "./activity";

const validChildId = "cljk2j3k40000a1b2c3d4e5f6";
const validRecordId = "cljk2j3k40001a1b2c3d4e5f7";

describe("activityTypeSchema", () => {
  it("accepts all valid activity types", () => {
    const validTypes = [
      "TUMMY_TIME",
      "BATH",
      "OUTDOOR_PLAY",
      "INDOOR_PLAY",
      "SCREEN_TIME",
      "SKIN_TO_SKIN",
      "STORYTIME",
      "TEETH_BRUSHING",
      "OTHER",
    ];

    validTypes.forEach((type) => {
      expect(activityTypeSchema.parse(type)).toBe(type);
    });
  });

  it("rejects invalid activity types", () => {
    expect(() => activityTypeSchema.parse("SWIMMING")).toThrow();
    expect(() => activityTypeSchema.parse("tummy_time")).toThrow();
  });
});

describe("startActivitySchema", () => {
  it("requires childId and activityType", () => {
    expect(() =>
      startActivitySchema.parse({ childId: validChildId })
    ).toThrow();
  });

  it("accepts valid input", () => {
    const result = startActivitySchema.parse({
      childId: validChildId,
      activityType: "TUMMY_TIME",
    });
    expect(result.activityType).toBe("TUMMY_TIME");
  });

  it("accepts optional startTime", () => {
    const now = new Date();
    const result = startActivitySchema.parse({
      childId: validChildId,
      activityType: "BATH",
      startTime: now,
    });
    expect(result.startTime).toEqual(now);
  });
});

describe("endActivitySchema", () => {
  it("requires id", () => {
    expect(() => endActivitySchema.parse({})).toThrow();
  });

  it("accepts minimal input", () => {
    const result = endActivitySchema.parse({ id: validRecordId });
    expect(result.id).toBe(validRecordId);
  });

  it("accepts optional fields", () => {
    const result = endActivitySchema.parse({
      id: validRecordId,
      endTime: new Date(),
      notes: "Fun session",
    });
    expect(result.notes).toBe("Fun session");
  });
});

describe("logActivitySchema", () => {
  it("requires childId, activityType, and startTime", () => {
    expect(() =>
      logActivitySchema.parse({
        childId: validChildId,
        activityType: "BATH",
      })
    ).toThrow();
  });

  it("accepts valid input", () => {
    const result = logActivitySchema.parse({
      childId: validChildId,
      activityType: "STORYTIME",
      startTime: new Date(),
    });
    expect(result.activityType).toBe("STORYTIME");
  });

  it("accepts optional endTime and notes", () => {
    const result = logActivitySchema.parse({
      childId: validChildId,
      activityType: "OUTDOOR_PLAY",
      startTime: new Date(),
      endTime: new Date(),
      notes: "Park visit",
    });
    expect(result.notes).toBe("Park visit");
  });
});

describe("updateActivitySchema", () => {
  it("requires id", () => {
    expect(() => updateActivitySchema.parse({})).toThrow();
  });

  it("accepts partial update", () => {
    const result = updateActivitySchema.parse({
      id: validRecordId,
      activityType: "INDOOR_PLAY",
    });
    expect(result.activityType).toBe("INDOOR_PLAY");
  });

  it("accepts nullable fields", () => {
    const result = updateActivitySchema.parse({
      id: validRecordId,
      endTime: null,
      notes: null,
    });
    expect(result.endTime).toBeNull();
  });
});

describe("deleteActivitySchema", () => {
  it("requires valid id", () => {
    const result = deleteActivitySchema.parse({ id: validRecordId });
    expect(result.id).toBe(validRecordId);
  });
});

describe("getActivityRecordsSchema", () => {
  it("requires childId", () => {
    expect(() => getActivityRecordsSchema.parse({})).toThrow();
  });

  it("accepts activityType filter", () => {
    const result = getActivityRecordsSchema.parse({
      childId: validChildId,
      activityType: "BATH",
    });
    expect(result.activityType).toBe("BATH");
  });

  it("accepts period filter", () => {
    const result = getActivityRecordsSchema.parse({
      childId: validChildId,
      period: "week",
    });
    expect(result.period).toBe("week");
  });
});

describe("activitySummarySchema", () => {
  it("uses default period", () => {
    const result = activitySummarySchema.parse({ childId: validChildId });
    expect(result.period).toBe("today");
  });
});
