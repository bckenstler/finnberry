import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatDuration,
  formatTime,
  formatDate,
  formatDateTime,
  getDateRange,
  calculateDurationMinutes,
} from "./date";

describe("formatDuration", () => {
  it("formats minutes only", () => {
    expect(formatDuration(30)).toBe("30m");
    expect(formatDuration(1)).toBe("1m");
    expect(formatDuration(59)).toBe("59m");
  });

  it("formats hours only when no remainder", () => {
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(180)).toBe("3h");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(145)).toBe("2h 25m");
    expect(formatDuration(61)).toBe("1h 1m");
  });

  it("handles zero", () => {
    expect(formatDuration(0)).toBe("0m");
  });
});

describe("formatTime", () => {
  it("formats Date object", () => {
    const date = new Date("2024-01-15T14:30:00");
    expect(formatTime(date)).toBe("2:30 PM");
  });

  it("formats ISO string", () => {
    const result = formatTime("2024-01-15T09:15:00");
    expect(result).toBe("9:15 AM");
  });

  it("formats midnight", () => {
    const date = new Date("2024-01-15T00:00:00");
    expect(formatTime(date)).toBe("12:00 AM");
  });

  it("formats noon", () => {
    const date = new Date("2024-01-15T12:00:00");
    expect(formatTime(date)).toBe("12:00 PM");
  });
});

describe("formatDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns Today for today's date", () => {
    const today = new Date("2024-01-15T08:00:00");
    expect(formatDate(today)).toBe("Today");
  });

  it("returns Yesterday for yesterday's date", () => {
    const yesterday = new Date("2024-01-14T12:00:00");
    expect(formatDate(yesterday)).toBe("Yesterday");
  });

  it("formats older dates as MMM d", () => {
    const oldDate = new Date("2024-01-10T12:00:00");
    expect(formatDate(oldDate)).toBe("Jan 10");
  });

  it("handles ISO string input", () => {
    expect(formatDate("2024-01-15T08:00:00")).toBe("Today");
  });
});

describe("formatDateTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("combines date and time", () => {
    const date = new Date("2024-01-15T14:30:00");
    expect(formatDateTime(date)).toBe("Today at 2:30 PM");
  });

  it("works with older dates", () => {
    const date = new Date("2024-01-10T09:00:00");
    expect(formatDateTime(date)).toBe("Jan 10 at 9:00 AM");
  });
});

describe("getDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today's range", () => {
    const { start, end } = getDateRange("today");
    expect(start.getDate()).toBe(15);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getDate()).toBe(15);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it("returns week range", () => {
    const { start, end } = getDateRange("week");
    // Week starts on Sunday
    expect(start.getDay()).toBe(0);
    expect(end.getDay()).toBe(6);
  });

  it("returns month range (last 30 days)", () => {
    const { start, end } = getDateRange("month");
    const diffDays = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBe(30);
  });
});

describe("calculateDurationMinutes", () => {
  it("calculates duration between Date objects", () => {
    const start = new Date("2024-01-15T10:00:00");
    const end = new Date("2024-01-15T11:30:00");
    expect(calculateDurationMinutes(start, end)).toBe(90);
  });

  it("calculates duration between ISO strings", () => {
    const result = calculateDurationMinutes(
      "2024-01-15T10:00:00",
      "2024-01-15T10:45:00"
    );
    expect(result).toBe(45);
  });

  it("handles mixed input types", () => {
    const start = new Date("2024-01-15T10:00:00");
    const result = calculateDurationMinutes(start, "2024-01-15T12:00:00");
    expect(result).toBe(120);
  });

  it("returns 0 for same times", () => {
    const time = new Date("2024-01-15T10:00:00");
    expect(calculateDurationMinutes(time, time)).toBe(0);
  });

  it("handles negative duration (end before start)", () => {
    const start = new Date("2024-01-15T12:00:00");
    const end = new Date("2024-01-15T10:00:00");
    expect(calculateDurationMinutes(start, end)).toBe(-120);
  });
});
