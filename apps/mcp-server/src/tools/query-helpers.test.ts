import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseQueryDates,
  buildPagination,
  sanitizeLimit,
  sanitizeOffset,
  buildQueryResponse,
  QUERY_INPUT_SCHEMA_PROPERTIES,
} from "./query-helpers";

describe("parseQueryDates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses provided dates when both are specified", () => {
    const result = parseQueryDates("2024-01-01T00:00:00Z", "2024-01-10T23:59:59Z");

    expect(result.start).toEqual(new Date("2024-01-01T00:00:00Z"));
    expect(result.end).toEqual(new Date("2024-01-10T23:59:59Z"));
  });

  it("defaults endDate to now when not provided", () => {
    const result = parseQueryDates("2024-01-01T00:00:00Z");

    expect(result.start).toEqual(new Date("2024-01-01T00:00:00Z"));
    expect(result.end).toEqual(new Date("2024-01-15T12:00:00Z"));
  });

  it("defaults startDate to 7 days before endDate when not provided", () => {
    const result = parseQueryDates(undefined, "2024-01-15T12:00:00Z");

    expect(result.start).toEqual(new Date("2024-01-08T12:00:00Z")); // 7 days before
    expect(result.end).toEqual(new Date("2024-01-15T12:00:00Z"));
  });

  it("defaults both dates when neither provided", () => {
    const result = parseQueryDates();

    expect(result.end).toEqual(new Date("2024-01-15T12:00:00Z"));
    expect(result.start).toEqual(new Date("2024-01-08T12:00:00Z")); // 7 days ago
  });
});

describe("buildPagination", () => {
  it("indicates hasMore when more records exist", () => {
    const pagination = buildPagination(100, 10, 0);

    expect(pagination.total).toBe(100);
    expect(pagination.limit).toBe(10);
    expect(pagination.offset).toBe(0);
    expect(pagination.hasMore).toBe(true);
    expect(pagination.nextOffset).toBe(10);
  });

  it("indicates no more records when at end", () => {
    const pagination = buildPagination(100, 10, 90);

    expect(pagination.hasMore).toBe(false);
    expect(pagination.nextOffset).toBeNull();
  });

  it("handles exact boundary (offset + limit = total)", () => {
    const pagination = buildPagination(50, 25, 25);

    expect(pagination.hasMore).toBe(false);
    expect(pagination.nextOffset).toBeNull();
  });

  it("handles empty result set", () => {
    const pagination = buildPagination(0, 10, 0);

    expect(pagination.total).toBe(0);
    expect(pagination.hasMore).toBe(false);
    expect(pagination.nextOffset).toBeNull();
  });

  it("calculates nextOffset correctly", () => {
    const pagination = buildPagination(100, 20, 40);

    expect(pagination.nextOffset).toBe(60);
  });
});

describe("sanitizeLimit", () => {
  it("returns default 100 when undefined", () => {
    expect(sanitizeLimit(undefined)).toBe(100);
  });

  it("returns default 100 when null", () => {
    expect(sanitizeLimit(null as unknown as undefined)).toBe(100);
  });

  it("clamps values below 1 to 1", () => {
    expect(sanitizeLimit(0)).toBe(1);
    expect(sanitizeLimit(-5)).toBe(1);
  });

  it("clamps values above 500 to 500", () => {
    expect(sanitizeLimit(501)).toBe(500);
    expect(sanitizeLimit(1000)).toBe(500);
  });

  it("accepts values within range", () => {
    expect(sanitizeLimit(50)).toBe(50);
    expect(sanitizeLimit(1)).toBe(1);
    expect(sanitizeLimit(500)).toBe(500);
  });

  it("floors decimal values", () => {
    expect(sanitizeLimit(25.7)).toBe(25);
    expect(sanitizeLimit(99.9)).toBe(99);
  });
});

describe("sanitizeOffset", () => {
  it("returns default 0 when undefined", () => {
    expect(sanitizeOffset(undefined)).toBe(0);
  });

  it("returns default 0 when null", () => {
    expect(sanitizeOffset(null as unknown as undefined)).toBe(0);
  });

  it("clamps negative values to 0", () => {
    expect(sanitizeOffset(-1)).toBe(0);
    expect(sanitizeOffset(-100)).toBe(0);
  });

  it("accepts non-negative values", () => {
    expect(sanitizeOffset(0)).toBe(0);
    expect(sanitizeOffset(50)).toBe(50);
    expect(sanitizeOffset(1000)).toBe(1000);
  });

  it("floors decimal values", () => {
    expect(sanitizeOffset(25.7)).toBe(25);
    expect(sanitizeOffset(99.9)).toBe(99);
  });
});

describe("buildQueryResponse", () => {
  it("builds complete response structure", () => {
    const records = [{ id: "1" }, { id: "2" }];
    const start = new Date("2024-01-01T00:00:00Z");
    const end = new Date("2024-01-15T00:00:00Z");

    const response = buildQueryResponse(records, 50, 10, 0, start, end);

    expect(response.records).toEqual(records);
    expect(response.pagination.total).toBe(50);
    expect(response.pagination.limit).toBe(10);
    expect(response.pagination.offset).toBe(0);
    expect(response.dateRange.start).toBe("2024-01-01T00:00:00.000Z");
    expect(response.dateRange.end).toBe("2024-01-15T00:00:00.000Z");
    expect(response.summary).toBeUndefined();
  });

  it("includes summary when provided", () => {
    const records = [{ id: "1" }];
    const start = new Date("2024-01-01T00:00:00Z");
    const end = new Date("2024-01-15T00:00:00Z");
    const summary = { totalCount: 10, averageValue: 5.5 };

    const response = buildQueryResponse(records, 10, 100, 0, start, end, summary);

    expect(response.summary).toEqual({ totalCount: 10, averageValue: 5.5 });
  });

  it("handles empty records array", () => {
    const start = new Date("2024-01-01T00:00:00Z");
    const end = new Date("2024-01-15T00:00:00Z");

    const response = buildQueryResponse([], 0, 100, 0, start, end);

    expect(response.records).toEqual([]);
    expect(response.pagination.total).toBe(0);
    expect(response.pagination.hasMore).toBe(false);
  });
});

describe("QUERY_INPUT_SCHEMA_PROPERTIES", () => {
  it("has all required properties", () => {
    expect(QUERY_INPUT_SCHEMA_PROPERTIES.childId).toBeDefined();
    expect(QUERY_INPUT_SCHEMA_PROPERTIES.startDate).toBeDefined();
    expect(QUERY_INPUT_SCHEMA_PROPERTIES.endDate).toBeDefined();
    expect(QUERY_INPUT_SCHEMA_PROPERTIES.limit).toBeDefined();
    expect(QUERY_INPUT_SCHEMA_PROPERTIES.offset).toBeDefined();
    expect(QUERY_INPUT_SCHEMA_PROPERTIES.orderBy).toBeDefined();
    expect(QUERY_INPUT_SCHEMA_PROPERTIES.includeSummary).toBeDefined();
  });

  it("has correct limit constraints", () => {
    expect(QUERY_INPUT_SCHEMA_PROPERTIES.limit.minimum).toBe(1);
    expect(QUERY_INPUT_SCHEMA_PROPERTIES.limit.maximum).toBe(500);
    expect(QUERY_INPUT_SCHEMA_PROPERTIES.limit.default).toBe(100);
  });

  it("has correct orderBy enum values", () => {
    expect(QUERY_INPUT_SCHEMA_PROPERTIES.orderBy.enum).toEqual(["asc", "desc"]);
    expect(QUERY_INPUT_SCHEMA_PROPERTIES.orderBy.default).toBe("desc");
  });

  it("has correct offset constraints", () => {
    expect(QUERY_INPUT_SCHEMA_PROPERTIES.offset.minimum).toBe(0);
    expect(QUERY_INPUT_SCHEMA_PROPERTIES.offset.default).toBe(0);
  });
});
