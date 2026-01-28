import { describe, it, expect, vi } from "vitest";
import {
  getDurationInfo,
  calculateTotalMinutes,
  getCompletedRecords,
  mapTimerRecordBase,
  mapRecentRecords,
  buildStartResponse,
  buildEndResponse,
  buildLogResponse,
  type TimerRecord,
} from "./helpers";

describe("getDurationInfo", () => {
  it("returns 'ongoing' when endTime is null", () => {
    const result = getDurationInfo(new Date("2024-01-15T10:00:00"), null);

    expect(result.duration).toBe("ongoing");
    expect(result.durationMinutes).toBeNull();
  });

  it("calculates duration correctly for completed record", () => {
    const startTime = new Date("2024-01-15T10:00:00");
    const endTime = new Date("2024-01-15T11:30:00");

    const result = getDurationInfo(startTime, endTime);

    expect(result.durationMinutes).toBe(90);
    expect(result.duration).toBe("1h 30m");
  });

  it("handles short durations", () => {
    const startTime = new Date("2024-01-15T10:00:00");
    const endTime = new Date("2024-01-15T10:15:00");

    const result = getDurationInfo(startTime, endTime);

    expect(result.durationMinutes).toBe(15);
    expect(result.duration).toBe("15m");
  });
});

describe("calculateTotalMinutes", () => {
  it("calculates total minutes from completed records", () => {
    const records: TimerRecord[] = [
      { id: "1", startTime: new Date("2024-01-15T10:00:00"), endTime: new Date("2024-01-15T11:00:00") },
      { id: "2", startTime: new Date("2024-01-15T12:00:00"), endTime: new Date("2024-01-15T12:30:00") },
    ];

    const total = calculateTotalMinutes(records);

    expect(total).toBe(90); // 60 + 30 minutes
  });

  it("excludes records without endTime", () => {
    const records: TimerRecord[] = [
      { id: "1", startTime: new Date("2024-01-15T10:00:00"), endTime: new Date("2024-01-15T11:00:00") },
      { id: "2", startTime: new Date("2024-01-15T12:00:00"), endTime: null },
    ];

    const total = calculateTotalMinutes(records);

    expect(total).toBe(60); // Only first record counts
  });

  it("returns 0 for empty array", () => {
    const total = calculateTotalMinutes([]);
    expect(total).toBe(0);
  });

  it("returns 0 when all records are ongoing", () => {
    const records: TimerRecord[] = [
      { id: "1", startTime: new Date("2024-01-15T10:00:00"), endTime: null },
      { id: "2", startTime: new Date("2024-01-15T12:00:00"), endTime: null },
    ];

    const total = calculateTotalMinutes(records);

    expect(total).toBe(0);
  });
});

describe("getCompletedRecords", () => {
  it("filters to only completed records", () => {
    const records: TimerRecord[] = [
      { id: "1", startTime: new Date("2024-01-15T10:00:00"), endTime: new Date("2024-01-15T11:00:00") },
      { id: "2", startTime: new Date("2024-01-15T12:00:00"), endTime: null },
      { id: "3", startTime: new Date("2024-01-15T14:00:00"), endTime: new Date("2024-01-15T15:00:00") },
    ];

    const completed = getCompletedRecords(records);

    expect(completed).toHaveLength(2);
    expect(completed.map((r) => r.id)).toEqual(["1", "3"]);
  });

  it("returns empty array when no completed records", () => {
    const records: TimerRecord[] = [
      { id: "1", startTime: new Date("2024-01-15T10:00:00"), endTime: null },
    ];

    const completed = getCompletedRecords(records);

    expect(completed).toHaveLength(0);
  });
});

describe("mapTimerRecordBase", () => {
  it("maps record with endTime to output format", () => {
    const record: TimerRecord = {
      id: "test-id",
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T11:30:00Z"),
    };

    const result = mapTimerRecordBase(record);

    expect(result.id).toBe("test-id");
    expect(result.startTime).toBe("2024-01-15T10:00:00.000Z");
    expect(result.endTime).toBe("2024-01-15T11:30:00.000Z");
    expect(result.duration).toBe("1h 30m");
  });

  it("maps ongoing record correctly", () => {
    const record: TimerRecord = {
      id: "test-id",
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: null,
    };

    const result = mapTimerRecordBase(record);

    expect(result.id).toBe("test-id");
    expect(result.startTime).toBe("2024-01-15T10:00:00.000Z");
    expect(result.endTime).toBeUndefined();
    expect(result.duration).toBe("ongoing");
  });
});

describe("mapRecentRecords", () => {
  it("maps records with extra fields", () => {
    const records: TimerRecord[] = [
      { id: "1", startTime: new Date("2024-01-15T10:00:00Z"), endTime: new Date("2024-01-15T11:00:00Z"), sleepType: "NAP" },
      { id: "2", startTime: new Date("2024-01-15T12:00:00Z"), endTime: new Date("2024-01-15T13:00:00Z"), sleepType: "NIGHT" },
    ];

    const result = mapRecentRecords(records, 10, (r) => ({
      sleepType: r.sleepType as string,
    }));

    expect(result).toHaveLength(2);
    expect(result[0]!.sleepType).toBe("NAP");
    expect(result[1]!.sleepType).toBe("NIGHT");
  });

  it("respects limit parameter", () => {
    const records: TimerRecord[] = [
      { id: "1", startTime: new Date("2024-01-15T10:00:00Z"), endTime: new Date("2024-01-15T11:00:00Z") },
      { id: "2", startTime: new Date("2024-01-15T12:00:00Z"), endTime: new Date("2024-01-15T13:00:00Z") },
      { id: "3", startTime: new Date("2024-01-15T14:00:00Z"), endTime: new Date("2024-01-15T15:00:00Z") },
    ];

    const result = mapRecentRecords(records, 2, () => ({}));

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(["1", "2"]);
  });
});

describe("buildStartResponse", () => {
  it("builds start response with required fields", () => {
    const startTime = new Date("2024-01-15T10:00:00Z");

    const result = buildStartResponse("sleepId", "test-123", "Sleep started", startTime);

    expect(result.success).toBe(true);
    expect(result.sleepId).toBe("test-123");
    expect(result.message).toBe("Sleep started");
    expect(result.startTime).toBe("2024-01-15T10:00:00.000Z");
  });

  it("includes extra fields when provided", () => {
    const startTime = new Date("2024-01-15T10:00:00Z");

    const result = buildStartResponse("feedingId", "feed-123", "Feeding started", startTime, {
      side: "LEFT",
      childName: "Baby",
    });

    expect(result.feedingId).toBe("feed-123");
    expect(result.side).toBe("LEFT");
    expect(result.childName).toBe("Baby");
  });
});

describe("buildEndResponse", () => {
  it("builds end response with duration info", () => {
    const startTime = new Date("2024-01-15T10:00:00Z");
    const endTime = new Date("2024-01-15T11:30:00Z");

    const result = buildEndResponse("sleepId", "test-123", startTime, endTime);

    expect(result.success).toBe(true);
    expect(result.sleepId).toBe("test-123");
    expect(result.duration).toBe("1h 30m");
    expect(result.durationMinutes).toBe(90);
  });

  it("includes extra fields when provided", () => {
    const startTime = new Date("2024-01-15T10:00:00Z");
    const endTime = new Date("2024-01-15T10:30:00Z");

    const result = buildEndResponse("pumpingId", "pump-123", startTime, endTime, {
      amountMl: 120,
    });

    expect(result.pumpingId).toBe("pump-123");
    expect(result.amountMl).toBe(120);
  });
});

describe("buildLogResponse", () => {
  it("builds log response for completed record", () => {
    const startTime = new Date("2024-01-15T10:00:00Z");
    const endTime = new Date("2024-01-15T11:00:00Z");

    const result = buildLogResponse("activityId", "act-123", startTime, endTime);

    expect(result.success).toBe(true);
    expect(result.activityId).toBe("act-123");
    expect(result.duration).toBe("1h");
  });

  it("handles null endTime for ongoing record", () => {
    const startTime = new Date("2024-01-15T10:00:00Z");

    const result = buildLogResponse("sleepId", "sleep-123", startTime, null);

    expect(result.success).toBe(true);
    expect(result.sleepId).toBe("sleep-123");
    expect(result.duration).toBeNull();
  });

  it("includes extra fields when provided", () => {
    const startTime = new Date("2024-01-15T10:00:00Z");
    const endTime = new Date("2024-01-15T10:30:00Z");

    const result = buildLogResponse("feedingId", "feed-123", startTime, endTime, {
      feedingType: "BOTTLE",
      amountMl: 180,
    });

    expect(result.feedingId).toBe("feed-123");
    expect(result.feedingType).toBe("BOTTLE");
    expect(result.amountMl).toBe(180);
  });
});
