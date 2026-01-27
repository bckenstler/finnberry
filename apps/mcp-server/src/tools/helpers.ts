import { calculateDurationMinutes, formatDuration } from "@finnberry/utils";

/**
 * Represents a timer-based record with start and optional end time
 */
export interface TimerRecord {
  id: string;
  startTime: Date;
  endTime: Date | null;
  [key: string]: unknown;
}

/**
 * Calculate duration info for a timer record
 */
export function getDurationInfo(startTime: Date, endTime: Date | null): {
  duration: string;
  durationMinutes: number | null;
} {
  if (!endTime) {
    return { duration: "ongoing", durationMinutes: null };
  }
  const minutes = calculateDurationMinutes(startTime, endTime);
  return {
    duration: formatDuration(minutes),
    durationMinutes: minutes,
  };
}

/**
 * Calculate total minutes from an array of timer records
 */
export function calculateTotalMinutes<T extends TimerRecord>(records: T[]): number {
  return records.reduce((sum, r) => {
    if (!r.endTime) return sum;
    return sum + calculateDurationMinutes(r.startTime, r.endTime);
  }, 0);
}

/**
 * Filter records to only completed ones (with endTime)
 */
export function getCompletedRecords<T extends TimerRecord>(records: T[]): T[] {
  return records.filter((r): r is T & { endTime: Date } => r.endTime !== null);
}

/**
 * Base fields for mapping a timer record
 */
export interface MappedTimerRecord {
  id: string;
  startTime: string;
  endTime: string | undefined;
  duration: string;
}

/**
 * Map a timer record to base output format
 */
export function mapTimerRecordBase(record: TimerRecord): MappedTimerRecord {
  const { duration } = getDurationInfo(record.startTime, record.endTime);
  return {
    id: record.id,
    startTime: record.startTime.toISOString(),
    endTime: record.endTime?.toISOString(),
    duration,
  };
}

/**
 * Map recent records with a custom mapper for additional fields
 */
export function mapRecentRecords<T extends TimerRecord, R>(
  records: T[],
  limit: number,
  extraMapper: (record: T) => Omit<R, keyof MappedTimerRecord>
): (MappedTimerRecord & Omit<R, keyof MappedTimerRecord>)[] {
  return records.slice(0, limit).map((r) => ({
    ...mapTimerRecordBase(r),
    ...extraMapper(r),
  }));
}

/**
 * Build a success response for starting a timer
 */
export function buildStartResponse(
  idKey: string,
  id: string,
  message: string,
  startTime: Date,
  extraFields?: Record<string, unknown>
): Record<string, unknown> {
  return {
    success: true,
    [idKey]: id,
    message,
    startTime: startTime.toISOString(),
    ...extraFields,
  };
}

/**
 * Build a success response for ending a timer
 */
export function buildEndResponse(
  idKey: string,
  id: string,
  startTime: Date,
  endTime: Date,
  extraFields?: Record<string, unknown>
): Record<string, unknown> {
  const { duration, durationMinutes } = getDurationInfo(startTime, endTime);
  return {
    success: true,
    [idKey]: id,
    duration,
    durationMinutes,
    ...extraFields,
  };
}

/**
 * Build a success response for logging a completed record
 */
export function buildLogResponse(
  idKey: string,
  id: string,
  startTime: Date,
  endTime: Date | null,
  extraFields?: Record<string, unknown>
): Record<string, unknown> {
  const { duration } = getDurationInfo(startTime, endTime);
  return {
    success: true,
    [idKey]: id,
    duration: endTime ? duration : null,
    ...extraFields,
  };
}
