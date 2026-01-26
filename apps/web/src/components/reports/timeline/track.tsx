"use client";

import {
  normalizeToTimelinePosition,
  DAY_START_HOUR,
  getTimelineHourLabels,
  formatDurationPrecise,
} from "@finnberry/utils";
import {
  getActivityBarClasses,
  feedingTypeToCategory,
  type ActivityCategory,
} from "@/lib/activity-colors";

interface SleepRecord {
  id: string;
  startTime: Date;
  endTime: Date | null;
  sleepType: string;
}

interface FeedingRecord {
  id: string;
  startTime: Date;
  endTime: Date | null;
  feedingType: string;
  side?: string | null;
  amountMl?: number | null;
}

interface DiaperRecord {
  id: string;
  time: Date;
  diaperType: string;
}

interface TimelineTrackProps {
  sleepRecords: SleepRecord[];
  feedingRecords: FeedingRecord[];
  diaperRecords: DiaperRecord[];
  dayStart: Date;
}

interface TimelineEvent {
  id: string;
  category: ActivityCategory;
  startPos: number; // 0-24 position
  endPos: number; // 0-24 position
  label: string;
  duration?: string; // Formatted duration for timed events
  column?: number; // For overlapping events
}

export function TimelineTrack({
  sleepRecords,
  feedingRecords,
  diaperRecords,
}: TimelineTrackProps) {
  const hourLabels = getTimelineHourLabels(DAY_START_HOUR);

  // Convert all records to timeline events
  const events: TimelineEvent[] = [];

  // Add sleep events
  sleepRecords.forEach((record) => {
    const startPos = normalizeToTimelinePosition(record.startTime, DAY_START_HOUR);
    const endTime = record.endTime || new Date();
    const endPos = normalizeToTimelinePosition(endTime, DAY_START_HOUR);
    const duration = formatDurationPrecise(record.startTime, endTime);

    events.push({
      id: `sleep-${record.id}`,
      category: "sleep",
      startPos,
      endPos: Math.max(endPos, startPos + 0.25), // Minimum 15min display
      label: record.sleepType === "NIGHT" ? "Night" : "Nap",
      duration,
    });
  });

  // Add feeding events
  feedingRecords.forEach((record) => {
    const startPos = normalizeToTimelinePosition(record.startTime, DAY_START_HOUR);
    const endPos = record.endTime
      ? normalizeToTimelinePosition(record.endTime, DAY_START_HOUR)
      : startPos + 0.25; // Default 15min for instant records

    const category = feedingTypeToCategory(
      record.feedingType as "BREAST" | "BOTTLE" | "SOLIDS"
    );

    let label = "";
    let duration: string | undefined;
    if (record.feedingType === "BREAST") {
      label = "Breast";
      if (record.endTime) {
        duration = formatDurationPrecise(record.startTime, record.endTime);
      }
    } else if (record.feedingType === "BOTTLE") {
      label = "Bottle";
      if (record.amountMl) {
        label = `${Math.round(record.amountMl / 29.574)}oz`;
      }
    } else if (record.feedingType === "SOLIDS") {
      label = "Solids";
    }

    events.push({
      id: `feeding-${record.id}`,
      category,
      startPos,
      endPos: Math.max(endPos, startPos + 0.25),
      label,
      duration,
    });
  });

  // Add diaper events (point events - show as small blocks)
  diaperRecords.forEach((record) => {
    const pos = normalizeToTimelinePosition(record.time, DAY_START_HOUR);

    const label =
      record.diaperType === "WET"
        ? "Wet"
        : record.diaperType === "DIRTY"
          ? "Poo"
          : record.diaperType === "BOTH"
            ? "Mixed"
            : "Dry";

    events.push({
      id: `diaper-${record.id}`,
      category: "diaper",
      startPos: pos,
      endPos: pos + 0.25, // 15min display width
      label,
    });
  });

  // Sort events by start time
  events.sort((a, b) => a.startPos - b.startPos);

  // Assign columns for overlapping events
  const assignColumns = (events: TimelineEvent[]): TimelineEvent[] => {
    const columns: { endPos: number }[] = [];

    return events.map((event) => {
      // Find first available column
      let column = 0;
      for (let i = 0; i < columns.length; i++) {
        if (columns[i].endPos <= event.startPos) {
          column = i;
          break;
        }
        column = i + 1;
      }

      // Update or add column
      if (column < columns.length) {
        columns[column].endPos = event.endPos;
      } else {
        columns.push({ endPos: event.endPos });
      }

      return { ...event, column };
    });
  };

  const eventsWithColumns = assignColumns(events);
  const maxColumns = Math.max(...eventsWithColumns.map((e) => (e.column ?? 0) + 1), 1);

  return (
    <div className="relative flex" style={{ height: "500px" }}>
      {/* Time axis - vertical on left */}
      <div className="w-12 flex-shrink-0 relative border-r border-border">
        {hourLabels.map((label, i) => (
          <div
            key={`${label}-${i}`}
            className="absolute right-2 text-xs text-muted-foreground -translate-y-1/2"
            style={{ top: `${(i / (hourLabels.length - 1)) * 100}%` }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Timeline content area */}
      <div className="flex-1 relative">
        {/* Hour grid lines */}
        {hourLabels.map((label, i) => (
          <div
            key={`line-${label}-${i}`}
            className="absolute left-0 right-0 border-t border-border/30"
            style={{ top: `${(i / (hourLabels.length - 1)) * 100}%` }}
          />
        ))}

        {/* Events */}
        {eventsWithColumns.map((event) => {
          const top = (event.startPos / 24) * 100;
          const height = ((event.endPos - event.startPos) / 24) * 100;
          const columnWidth = 100 / maxColumns;
          const left = (event.column ?? 0) * columnWidth;
          const isSmallBlock = height < 4; // Less than ~1 hour

          return (
            <div
              key={event.id}
              className={`absolute rounded-md flex items-center overflow-hidden text-xs font-medium shadow-sm ${getActivityBarClasses(event.category)}`}
              style={{
                top: `${Math.max(0, top)}%`,
                height: `${Math.max(2, Math.min(height, 100 - top))}%`,
                left: `${left}%`,
                width: `${columnWidth - 1}%`,
                minHeight: "20px",
              }}
            >
              <div className="flex-1 flex items-center justify-between px-2 min-w-0">
                {event.label && (
                  <span className="truncate">{event.label}</span>
                )}
                {event.duration && !isSmallBlock && (
                  <span className="truncate text-[10px] opacity-80 ml-1">{event.duration}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Current time indicator */}
        <CurrentTimeIndicator />
      </div>
    </div>
  );
}

function CurrentTimeIndicator() {
  const now = new Date();
  const pos = normalizeToTimelinePosition(now, DAY_START_HOUR);
  const top = (pos / 24) * 100;

  // Only show if within the day (0-100%)
  if (top < 0 || top > 100) return null;

  return (
    <div
      className="absolute left-0 right-0 flex items-center z-10 pointer-events-none"
      style={{ top: `${top}%` }}
    >
      <div className="w-2 h-2 rounded-full bg-red-500" />
      <div className="flex-1 h-0.5 bg-red-500" />
    </div>
  );
}
