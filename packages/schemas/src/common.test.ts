import { describe, it, expect } from "vitest";
import {
  idSchema,
  paginationSchema,
  dateRangeSchema,
  periodSchema,
  timestampSchema,
} from "./common";

describe("idSchema", () => {
  it("accepts valid CUID", () => {
    const validCuid = "cljk2j3k40000a1b2c3d4e5f6";
    expect(() => idSchema.parse(validCuid)).not.toThrow();
  });

  it("rejects invalid CUID", () => {
    expect(() => idSchema.parse("invalid")).toThrow();
    expect(() => idSchema.parse("")).toThrow();
    expect(() => idSchema.parse(123)).toThrow();
  });
});

describe("paginationSchema", () => {
  it("accepts valid pagination input", () => {
    const result = paginationSchema.parse({ limit: 10 });
    expect(result.limit).toBe(10);
  });

  it("uses default limit of 20", () => {
    const result = paginationSchema.parse({});
    expect(result.limit).toBe(20);
  });

  it("accepts cursor", () => {
    const result = paginationSchema.parse({
      limit: 10,
      cursor: "some-cursor",
    });
    expect(result.cursor).toBe("some-cursor");
  });

  it("rejects limit below minimum", () => {
    expect(() => paginationSchema.parse({ limit: 0 })).toThrow();
  });

  it("rejects limit above maximum", () => {
    expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
  });
});

describe("dateRangeSchema", () => {
  it("accepts Date objects", () => {
    const result = dateRangeSchema.parse({
      start: new Date("2024-01-01"),
      end: new Date("2024-01-31"),
    });
    expect(result.start).toBeInstanceOf(Date);
    expect(result.end).toBeInstanceOf(Date);
  });

  it("coerces date strings to Date objects", () => {
    const result = dateRangeSchema.parse({
      start: "2024-01-01",
      end: "2024-01-31",
    });
    expect(result.start).toBeInstanceOf(Date);
    expect(result.end).toBeInstanceOf(Date);
  });

  it("rejects invalid dates", () => {
    expect(() =>
      dateRangeSchema.parse({
        start: "not-a-date",
        end: "2024-01-31",
      })
    ).toThrow();
  });

  it("requires both start and end", () => {
    expect(() => dateRangeSchema.parse({ start: "2024-01-01" })).toThrow();
    expect(() => dateRangeSchema.parse({ end: "2024-01-31" })).toThrow();
  });
});

describe("periodSchema", () => {
  it("accepts valid period values", () => {
    expect(periodSchema.parse("today")).toBe("today");
    expect(periodSchema.parse("week")).toBe("week");
    expect(periodSchema.parse("month")).toBe("month");
  });

  it("rejects invalid period values", () => {
    expect(() => periodSchema.parse("year")).toThrow();
    expect(() => periodSchema.parse("")).toThrow();
    expect(() => periodSchema.parse("invalid")).toThrow();
  });
});

describe("timestampSchema", () => {
  it("coerces date string to Date", () => {
    const result = timestampSchema.parse("2024-01-15T10:00:00Z");
    expect(result).toBeInstanceOf(Date);
  });

  it("accepts Date object", () => {
    const date = new Date();
    const result = timestampSchema.parse(date);
    expect(result).toBeInstanceOf(Date);
  });

  it("coerces timestamp number to Date", () => {
    const timestamp = Date.now();
    const result = timestampSchema.parse(timestamp);
    expect(result).toBeInstanceOf(Date);
  });
});
