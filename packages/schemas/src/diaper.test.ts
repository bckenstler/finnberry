import { describe, it, expect } from "vitest";
import {
  diaperTypeSchema,
  diaperColorSchema,
  diaperConsistencySchema,
  logDiaperSchema,
  updateDiaperSchema,
  deleteDiaperSchema,
  getDiaperRecordsSchema,
  diaperSummarySchema,
} from "./diaper";

const validChildId = "cljk2j3k40000a1b2c3d4e5f6";
const validRecordId = "cljk2j3k40001a1b2c3d4e5f7";

describe("diaperTypeSchema", () => {
  it("accepts valid diaper types", () => {
    expect(diaperTypeSchema.parse("WET")).toBe("WET");
    expect(diaperTypeSchema.parse("DIRTY")).toBe("DIRTY");
    expect(diaperTypeSchema.parse("BOTH")).toBe("BOTH");
    expect(diaperTypeSchema.parse("DRY")).toBe("DRY");
  });

  it("rejects invalid types", () => {
    expect(() => diaperTypeSchema.parse("MESSY")).toThrow();
    expect(() => diaperTypeSchema.parse("wet")).toThrow();
  });
});

describe("diaperColorSchema", () => {
  it("accepts valid colors", () => {
    expect(diaperColorSchema.parse("YELLOW")).toBe("YELLOW");
    expect(diaperColorSchema.parse("GREEN")).toBe("GREEN");
    expect(diaperColorSchema.parse("BROWN")).toBe("BROWN");
    expect(diaperColorSchema.parse("BLACK")).toBe("BLACK");
    expect(diaperColorSchema.parse("RED")).toBe("RED");
    expect(diaperColorSchema.parse("WHITE")).toBe("WHITE");
    expect(diaperColorSchema.parse("OTHER")).toBe("OTHER");
  });

  it("rejects invalid colors", () => {
    expect(() => diaperColorSchema.parse("BLUE")).toThrow();
  });
});

describe("diaperConsistencySchema", () => {
  it("accepts valid consistencies", () => {
    expect(diaperConsistencySchema.parse("WATERY")).toBe("WATERY");
    expect(diaperConsistencySchema.parse("LOOSE")).toBe("LOOSE");
    expect(diaperConsistencySchema.parse("SOFT")).toBe("SOFT");
    expect(diaperConsistencySchema.parse("FORMED")).toBe("FORMED");
    expect(diaperConsistencySchema.parse("HARD")).toBe("HARD");
  });

  it("rejects invalid consistencies", () => {
    expect(() => diaperConsistencySchema.parse("NORMAL")).toThrow();
  });
});

describe("logDiaperSchema", () => {
  it("requires childId and diaperType", () => {
    expect(() =>
      logDiaperSchema.parse({
        childId: validChildId,
      })
    ).toThrow();
  });

  it("accepts minimal input", () => {
    const result = logDiaperSchema.parse({
      childId: validChildId,
      diaperType: "WET",
    });
    expect(result.diaperType).toBe("WET");
  });

  it("accepts full input", () => {
    const result = logDiaperSchema.parse({
      childId: validChildId,
      time: new Date(),
      diaperType: "DIRTY",
      color: "BROWN",
      consistency: "SOFT",
      notes: "Normal",
    });
    expect(result.color).toBe("BROWN");
    expect(result.consistency).toBe("SOFT");
  });

  it("time is optional (defaults to now)", () => {
    const result = logDiaperSchema.parse({
      childId: validChildId,
      diaperType: "WET",
    });
    expect(result.time).toBeUndefined();
  });
});

describe("updateDiaperSchema", () => {
  it("requires id", () => {
    expect(() => updateDiaperSchema.parse({})).toThrow();
  });

  it("accepts partial update", () => {
    const result = updateDiaperSchema.parse({
      id: validRecordId,
      diaperType: "BOTH",
    });
    expect(result.diaperType).toBe("BOTH");
  });

  it("accepts nullable optional fields", () => {
    const result = updateDiaperSchema.parse({
      id: validRecordId,
      color: null,
      consistency: null,
      notes: null,
    });
    expect(result.color).toBeNull();
  });
});

describe("deleteDiaperSchema", () => {
  it("requires valid id", () => {
    const result = deleteDiaperSchema.parse({ id: validRecordId });
    expect(result.id).toBe(validRecordId);
  });
});

describe("getDiaperRecordsSchema", () => {
  it("requires childId", () => {
    expect(() => getDiaperRecordsSchema.parse({})).toThrow();
  });

  it("accepts diaperType filter", () => {
    const result = getDiaperRecordsSchema.parse({
      childId: validChildId,
      diaperType: "WET",
    });
    expect(result.diaperType).toBe("WET");
  });

  it("accepts period filter", () => {
    const result = getDiaperRecordsSchema.parse({
      childId: validChildId,
      period: "week",
    });
    expect(result.period).toBe("week");
  });
});

describe("diaperSummarySchema", () => {
  it("requires childId", () => {
    expect(() => diaperSummarySchema.parse({})).toThrow();
  });

  it("uses default period", () => {
    const result = diaperSummarySchema.parse({ childId: validChildId });
    expect(result.period).toBe("today");
  });
});
