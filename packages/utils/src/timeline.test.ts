import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  normalizeToTimelinePosition,
  getTimelineDayBoundaries,
  formatDurationPrecise,
  formatTimeShort,
  formatTimeRange,
  calculateTimelineWidth,
  getTimelineHourLabels,
  formatTimeSince,
  DAY_START_HOUR,
} from "./timeline";

describe("normalizeToTimelinePosition", () => {
  it("returns 0 for day start hour", () => {
    const date = new Date("2024-01-15T08:00:00");
    expect(normalizeToTimelinePosition(date)).toBe(0);
  });

  it("returns 12 for noon (4 hours after 8am)", () => {
    const date = new Date("2024-01-15T12:00:00");
    expect(normalizeToTimelinePosition(date)).toBe(4);
  });

  it("handles minutes", () => {
    const date = new Date("2024-01-15T08:30:00");
    expect(normalizeToTimelinePosition(date)).toBe(0.5);
  });

  it("wraps times before day start hour", () => {
    const date = new Date("2024-01-15T03:00:00"); // 3am is 19 hours after 8am
    expect(normalizeToTimelinePosition(date)).toBe(19);
  });

  it("handles midnight", () => {
    const date = new Date("2024-01-15T00:00:00"); // midnight is 16 hours after 8am
    expect(normalizeToTimelinePosition(date)).toBe(16);
  });

  it("accepts string dates", () => {
    const dateStr = "2024-01-15T08:00:00";
    expect(normalizeToTimelinePosition(dateStr)).toBe(0);
  });

  it("accepts custom day start hour", () => {
    const date = new Date("2024-01-15T06:00:00");
    expect(normalizeToTimelinePosition(date, 6)).toBe(0);
  });
});

describe("getTimelineDayBoundaries", () => {
  it("returns day boundaries starting at day start hour", () => {
    const date = new Date("2024-01-15T12:00:00");
    const { start, end } = getTimelineDayBoundaries(date);

    expect(start.getHours()).toBe(DAY_START_HOUR);
    expect(start.getDate()).toBe(15);
  });

  it("returns end 24 hours after start", () => {
    const date = new Date("2024-01-15T12:00:00");
    const { start, end } = getTimelineDayBoundaries(date);

    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBe(24);
  });

  it("accepts string dates", () => {
    const dateStr = "2024-01-15T12:00:00";
    const { start, end } = getTimelineDayBoundaries(dateStr);

    expect(start.getHours()).toBe(DAY_START_HOUR);
  });

  it("accepts custom day start hour", () => {
    const date = new Date("2024-01-15T12:00:00");
    const { start } = getTimelineDayBoundaries(date, 6);

    expect(start.getHours()).toBe(6);
  });
});

describe("formatDurationPrecise", () => {
  it("formats hours and minutes", () => {
    const start = new Date("2024-01-15T10:00:00");
    const end = new Date("2024-01-15T12:30:00");

    expect(formatDurationPrecise(start, end)).toBe("2h 30m");
  });

  it("formats hours only", () => {
    const start = new Date("2024-01-15T10:00:00");
    const end = new Date("2024-01-15T12:00:00");

    expect(formatDurationPrecise(start, end)).toBe("2h");
  });

  it("formats minutes only", () => {
    const start = new Date("2024-01-15T10:00:00");
    const end = new Date("2024-01-15T10:45:00");

    expect(formatDurationPrecise(start, end)).toBe("45m");
  });

  it("formats seconds only", () => {
    const start = new Date("2024-01-15T10:00:00");
    const end = new Date("2024-01-15T10:00:30");

    expect(formatDurationPrecise(start, end)).toBe("30s");
  });

  it("formats minutes and seconds", () => {
    const start = new Date("2024-01-15T10:00:00");
    const end = new Date("2024-01-15T10:05:30");

    expect(formatDurationPrecise(start, end)).toBe("5m 30s");
  });

  it("formats hours, minutes and seconds", () => {
    const start = new Date("2024-01-15T10:00:00");
    const end = new Date("2024-01-15T12:30:45");

    expect(formatDurationPrecise(start, end)).toBe("2h 30m 45s");
  });

  it("accepts string dates", () => {
    const start = "2024-01-15T10:00:00";
    const end = "2024-01-15T12:30:00";

    expect(formatDurationPrecise(start, end)).toBe("2h 30m");
  });
});

describe("formatTimeShort", () => {
  it("formats morning time", () => {
    const date = new Date("2024-01-15T09:30:00");
    expect(formatTimeShort(date)).toBe("9:30 AM");
  });

  it("formats afternoon time", () => {
    const date = new Date("2024-01-15T14:30:00");
    expect(formatTimeShort(date)).toBe("2:30 PM");
  });

  it("formats midnight", () => {
    const date = new Date("2024-01-15T00:00:00");
    expect(formatTimeShort(date)).toBe("12:00 AM");
  });

  it("formats noon", () => {
    const date = new Date("2024-01-15T12:00:00");
    expect(formatTimeShort(date)).toBe("12:00 PM");
  });

  it("accepts string dates", () => {
    const dateStr = "2024-01-15T09:30:00";
    expect(formatTimeShort(dateStr)).toBe("9:30 AM");
  });
});

describe("formatTimeRange", () => {
  it("formats completed range", () => {
    const start = new Date("2024-01-15T10:00:00");
    const end = new Date("2024-01-15T12:00:00");

    expect(formatTimeRange(start, end)).toBe("10:00 AM - 12:00 PM");
  });

  it("formats ongoing activity", () => {
    const start = new Date("2024-01-15T10:00:00");

    expect(formatTimeRange(start, null)).toBe("10:00 AM - ongoing");
  });

  it("accepts string dates", () => {
    const start = "2024-01-15T10:00:00";
    const end = "2024-01-15T12:00:00";

    expect(formatTimeRange(start, end)).toBe("10:00 AM - 12:00 PM");
  });
});

describe("calculateTimelineWidth", () => {
  it("calculates width for 2-hour duration on 24-hour timeline", () => {
    const start = new Date("2024-01-15T10:00:00");
    const end = new Date("2024-01-15T12:00:00");

    const width = calculateTimelineWidth(start, end);
    expect(width).toBeCloseTo((2 / 24) * 100, 2);
  });

  it("calculates width for 12-hour duration", () => {
    const start = new Date("2024-01-15T08:00:00");
    const end = new Date("2024-01-15T20:00:00");

    const width = calculateTimelineWidth(start, end);
    expect(width).toBe(50);
  });

  it("caps at 100%", () => {
    const start = new Date("2024-01-15T00:00:00");
    const end = new Date("2024-01-17T00:00:00"); // 48 hours

    const width = calculateTimelineWidth(start, end);
    expect(width).toBe(100);
  });

  it("handles custom maxHours", () => {
    const start = new Date("2024-01-15T10:00:00");
    const end = new Date("2024-01-15T11:00:00");

    const width = calculateTimelineWidth(start, end, 12);
    expect(width).toBeCloseTo((1 / 12) * 100, 2);
  });

  it("accepts string dates", () => {
    const start = "2024-01-15T10:00:00";
    const end = "2024-01-15T12:00:00";

    const width = calculateTimelineWidth(start, end);
    expect(width).toBeCloseTo((2 / 24) * 100, 2);
  });
});

describe("getTimelineHourLabels", () => {
  it("returns 25 labels (0-24 inclusive)", () => {
    const labels = getTimelineHourLabels();
    expect(labels).toHaveLength(25);
  });

  it("starts with day start hour", () => {
    const labels = getTimelineHourLabels();
    expect(labels[0]).toBe("8am");
  });

  it("ends with day start hour next day", () => {
    const labels = getTimelineHourLabels();
    expect(labels[24]).toBe("8am");
  });

  it("includes noon", () => {
    const labels = getTimelineHourLabels();
    expect(labels[4]).toBe("12pm");
  });

  it("includes midnight", () => {
    const labels = getTimelineHourLabels();
    expect(labels[16]).toBe("12am");
  });

  it("accepts custom day start hour", () => {
    const labels = getTimelineHourLabels(6);
    expect(labels[0]).toBe("6am");
  });
});

describe("formatTimeSince", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for very recent times', () => {
    const now = new Date("2024-01-15T12:00:00");
    vi.setSystemTime(now);

    expect(formatTimeSince(now)).toBe("just now");
  });

  it("formats minutes ago", () => {
    const now = new Date("2024-01-15T12:00:00");
    vi.setSystemTime(now);

    const past = new Date("2024-01-15T11:45:00");
    expect(formatTimeSince(past)).toBe("15m ago");
  });

  it("formats hours ago", () => {
    const now = new Date("2024-01-15T12:00:00");
    vi.setSystemTime(now);

    const past = new Date("2024-01-15T10:00:00");
    expect(formatTimeSince(past)).toBe("2h ago");
  });

  it("formats hours and minutes ago", () => {
    const now = new Date("2024-01-15T12:00:00");
    vi.setSystemTime(now);

    const past = new Date("2024-01-15T09:30:00");
    expect(formatTimeSince(past)).toBe("2h 30m ago");
  });

  it("formats 1 day ago", () => {
    const now = new Date("2024-01-15T12:00:00");
    vi.setSystemTime(now);

    const past = new Date("2024-01-14T10:00:00");
    expect(formatTimeSince(past)).toBe("1 day ago");
  });

  it("formats multiple days ago", () => {
    const now = new Date("2024-01-15T12:00:00");
    vi.setSystemTime(now);

    const past = new Date("2024-01-12T10:00:00");
    expect(formatTimeSince(past)).toBe("3 days ago");
  });

  it('returns "just now" for future times', () => {
    const now = new Date("2024-01-15T12:00:00");
    vi.setSystemTime(now);

    const future = new Date("2024-01-15T13:00:00");
    expect(formatTimeSince(future)).toBe("just now");
  });

  it("accepts string dates", () => {
    const now = new Date("2024-01-15T12:00:00");
    vi.setSystemTime(now);

    expect(formatTimeSince("2024-01-15T11:30:00")).toBe("30m ago");
  });
});

describe("DAY_START_HOUR constant", () => {
  it("is 8 (8am)", () => {
    expect(DAY_START_HOUR).toBe(8);
  });
});
