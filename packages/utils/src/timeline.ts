import { differenceInMinutes, format, startOfDay, addHours, parseISO } from "date-fns";

// Day starts at 8am for timeline visualization (baby sleep patterns)
export const DAY_START_HOUR = 8;

/**
 * Normalize a date/time to a position on a 24-hour timeline starting at dayStartHour
 * Returns a value from 0-24 where 0 is the start hour (e.g., 8am) and 24 is the same hour next day
 */
export function normalizeToTimelinePosition(
  date: Date | string,
  dayStartHour: number = DAY_START_HOUR
): number {
  const d = typeof date === "string" ? parseISO(date) : date;
  const hours = d.getHours();
  const minutes = d.getMinutes();

  // Calculate hours since day start
  let position = hours - dayStartHour + minutes / 60;

  // Wrap around for times before day start (e.g., 3am is 19 hours after 8am)
  if (position < 0) {
    position += 24;
  }

  return position;
}

/**
 * Get the "day" boundary dates for timeline display
 * Day runs from dayStartHour to dayStartHour next day (e.g., 8am to 8am)
 */
export function getTimelineDayBoundaries(
  date: Date | string,
  dayStartHour: number = DAY_START_HOUR
): { start: Date; end: Date } {
  const d = typeof date === "string" ? parseISO(date) : date;
  const dayStart = startOfDay(d);
  const start = addHours(dayStart, dayStartHour);
  const end = addHours(start, 24);

  return { start, end };
}

/**
 * Format duration in human-readable format
 * Supports both minutes and seconds precision
 */
export function formatDurationPrecise(
  startTime: Date | string,
  endTime: Date | string
): string {
  const start = typeof startTime === "string" ? parseISO(startTime) : startTime;
  const end = typeof endTime === "string" ? parseISO(endTime) : endTime;

  const diffMs = end.getTime() - start.getTime();
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return seconds > 0
      ? `${hours}h ${minutes}m ${seconds}s`
      : minutes > 0
        ? `${hours}h ${minutes}m`
        : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Format time in 12-hour format with AM/PM
 */
export function formatTimeShort(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "h:mm a");
}

/**
 * Format time range for display
 */
export function formatTimeRange(
  startTime: Date | string,
  endTime: Date | string | null
): string {
  const start = formatTimeShort(startTime);
  if (!endTime) {
    return `${start} - ongoing`;
  }
  const end = formatTimeShort(endTime);
  return `${start} - ${end}`;
}

/**
 * Calculate the width percentage for a timeline bar
 * Based on duration relative to 24 hours
 */
export function calculateTimelineWidth(
  startTime: Date | string,
  endTime: Date | string | null,
  maxHours: number = 24
): number {
  if (!endTime) {
    // For ongoing activities, extend to current time or max 1 hour for display
    const start =
      typeof startTime === "string" ? parseISO(startTime) : startTime;
    const now = new Date();
    const durationMinutes = differenceInMinutes(now, start);
    return Math.min((durationMinutes / 60 / maxHours) * 100, 100);
  }

  const start = typeof startTime === "string" ? parseISO(startTime) : startTime;
  const end = typeof endTime === "string" ? parseISO(endTime) : endTime;
  const durationMinutes = differenceInMinutes(end, start);

  return Math.min((durationMinutes / 60 / maxHours) * 100, 100);
}

/**
 * Get hour labels for timeline axis
 * Generates labels from day start to day start next day
 */
export function getTimelineHourLabels(
  dayStartHour: number = DAY_START_HOUR
): string[] {
  const labels: string[] = [];
  for (let i = 0; i < 24; i += 4) {
    let hour = (dayStartHour + i) % 24;
    const ampm = hour >= 12 ? "pm" : "am";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    labels.push(`${displayHour}${ampm}`);
  }
  // Add end label
  const endHour = dayStartHour;
  const endAmpm = endHour >= 12 ? "pm" : "am";
  const endDisplayHour =
    endHour === 0 ? 12 : endHour > 12 ? endHour - 12 : endHour;
  labels.push(`${endDisplayHour}${endAmpm}`);

  return labels;
}

/**
 * Format "time since" for display (e.g., "2h 15m ago")
 */
export function formatTimeSince(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  if (diffMs < 0) {
    return "just now";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays > 0) {
    return totalDays === 1 ? "1 day ago" : `${totalDays} days ago`;
  }

  if (totalHours > 0) {
    const mins = totalMinutes % 60;
    return mins > 0 ? `${totalHours}h ${mins}m ago` : `${totalHours}h ago`;
  }

  if (totalMinutes > 0) {
    return `${totalMinutes}m ago`;
  }

  return "just now";
}
