import { describe, it, expect } from "vitest";
import {
  feedingTypeSchema,
  breastSideSchema,
  logBreastfeedingSchema,
  startBreastfeedingSchema,
  endBreastfeedingSchema,
  logBottleSchema,
  logSolidsSchema,
  updateFeedingSchema,
  deleteFeedingSchema,
  getFeedingRecordsSchema,
  getActiveFeedingSchema,
  feedingSummarySchema,
} from "./feeding";

const validChildId = "cljk2j3k40000a1b2c3d4e5f6";
const validRecordId = "cljk2j3k40001a1b2c3d4e5f7";

describe("feedingTypeSchema", () => {
  it("accepts valid feeding types", () => {
    expect(feedingTypeSchema.parse("BREAST")).toBe("BREAST");
    expect(feedingTypeSchema.parse("BOTTLE")).toBe("BOTTLE");
    expect(feedingTypeSchema.parse("SOLIDS")).toBe("SOLIDS");
  });

  it("rejects invalid types", () => {
    expect(() => feedingTypeSchema.parse("FORMULA")).toThrow();
    expect(() => feedingTypeSchema.parse("breast")).toThrow();
  });
});

describe("breastSideSchema", () => {
  it("accepts valid sides", () => {
    expect(breastSideSchema.parse("LEFT")).toBe("LEFT");
    expect(breastSideSchema.parse("RIGHT")).toBe("RIGHT");
    expect(breastSideSchema.parse("BOTH")).toBe("BOTH");
  });

  it("rejects invalid sides", () => {
    expect(() => breastSideSchema.parse("MIDDLE")).toThrow();
  });
});

describe("logBreastfeedingSchema", () => {
  it("requires childId, startTime, and side", () => {
    expect(() =>
      logBreastfeedingSchema.parse({
        childId: validChildId,
        startTime: new Date(),
      })
    ).toThrow();
  });

  it("accepts valid input", () => {
    const result = logBreastfeedingSchema.parse({
      childId: validChildId,
      startTime: new Date(),
      side: "LEFT",
    });
    expect(result.side).toBe("LEFT");
  });

  it("accepts optional endTime and notes", () => {
    const result = logBreastfeedingSchema.parse({
      childId: validChildId,
      startTime: new Date(),
      endTime: new Date(),
      side: "BOTH",
      notes: "Good feeding",
    });
    expect(result.notes).toBe("Good feeding");
  });
});

describe("startBreastfeedingSchema", () => {
  it("requires childId and side", () => {
    expect(() =>
      startBreastfeedingSchema.parse({ childId: validChildId })
    ).toThrow();
  });

  it("accepts valid input", () => {
    const result = startBreastfeedingSchema.parse({
      childId: validChildId,
      side: "RIGHT",
    });
    expect(result.side).toBe("RIGHT");
  });
});

describe("endBreastfeedingSchema", () => {
  it("requires id", () => {
    expect(() => endBreastfeedingSchema.parse({})).toThrow();
  });

  it("accepts optional fields", () => {
    const result = endBreastfeedingSchema.parse({
      id: validRecordId,
      endTime: new Date(),
      notes: "Fell asleep",
    });
    expect(result.notes).toBe("Fell asleep");
  });
});

describe("logBottleSchema", () => {
  it("requires childId, startTime, and amountMl", () => {
    expect(() =>
      logBottleSchema.parse({
        childId: validChildId,
        startTime: new Date(),
      })
    ).toThrow();
  });

  it("accepts valid input", () => {
    const result = logBottleSchema.parse({
      childId: validChildId,
      startTime: new Date(),
      amountMl: 150,
    });
    expect(result.amountMl).toBe(150);
  });

  it("validates amountMl range", () => {
    expect(() =>
      logBottleSchema.parse({
        childId: validChildId,
        startTime: new Date(),
        amountMl: -10,
      })
    ).toThrow();

    expect(() =>
      logBottleSchema.parse({
        childId: validChildId,
        startTime: new Date(),
        amountMl: 600,
      })
    ).toThrow();
  });
});

describe("logSolidsSchema", () => {
  it("requires childId, startTime, and foodItems", () => {
    expect(() =>
      logSolidsSchema.parse({
        childId: validChildId,
        startTime: new Date(),
      })
    ).toThrow();
  });

  it("requires at least one food item", () => {
    expect(() =>
      logSolidsSchema.parse({
        childId: validChildId,
        startTime: new Date(),
        foodItems: [],
      })
    ).toThrow();
  });

  it("accepts valid input", () => {
    const result = logSolidsSchema.parse({
      childId: validChildId,
      startTime: new Date(),
      foodItems: ["banana", "avocado"],
    });
    expect(result.foodItems).toHaveLength(2);
  });

  it("rejects too many food items", () => {
    const tooManyItems = Array.from({ length: 21 }, (_, i) => `item${i}`);
    expect(() =>
      logSolidsSchema.parse({
        childId: validChildId,
        startTime: new Date(),
        foodItems: tooManyItems,
      })
    ).toThrow();
  });
});

describe("updateFeedingSchema", () => {
  it("requires id", () => {
    expect(() => updateFeedingSchema.parse({})).toThrow();
  });

  it("accepts nullable fields", () => {
    const result = updateFeedingSchema.parse({
      id: validRecordId,
      side: null,
      amountMl: null,
      notes: null,
    });
    expect(result.side).toBeNull();
  });
});

describe("deleteFeedingSchema", () => {
  it("requires valid id", () => {
    const result = deleteFeedingSchema.parse({ id: validRecordId });
    expect(result.id).toBe(validRecordId);
  });
});

describe("getFeedingRecordsSchema", () => {
  it("requires childId", () => {
    expect(() => getFeedingRecordsSchema.parse({})).toThrow();
  });

  it("accepts feedingType filter", () => {
    const result = getFeedingRecordsSchema.parse({
      childId: validChildId,
      feedingType: "BOTTLE",
    });
    expect(result.feedingType).toBe("BOTTLE");
  });
});

describe("getActiveFeedingSchema", () => {
  it("requires childId", () => {
    const result = getActiveFeedingSchema.parse({ childId: validChildId });
    expect(result.childId).toBe(validChildId);
  });
});

describe("feedingSummarySchema", () => {
  it("uses default period", () => {
    const result = feedingSummarySchema.parse({ childId: validChildId });
    expect(result.period).toBe("today");
  });
});
