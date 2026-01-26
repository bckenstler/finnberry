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
import { Moon, Baby, Milk, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Custom diaper icon component
function DiaperIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 7c0-1 1-2 2-2h12c1 0 2 1 2 2v4c0 4-3 8-8 8s-8-4-8-8V7z" />
      <path d="M8 5v2" />
      <path d="M16 5v2" />
    </svg>
  );
}

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

export type RecordType = "SLEEP" | "FEEDING" | "DIAPER";
export type { SleepRecord, FeedingRecord, DiaperRecord };

interface TimelineTrackProps {
  sleepRecords: SleepRecord[];
  feedingRecords: FeedingRecord[];
  diaperRecords: DiaperRecord[];
  dayStart: Date;
  selectedDate?: Date;
  onEventClick?: (recordId: string, recordType: RecordType, record: SleepRecord | FeedingRecord | DiaperRecord) => void;
}

interface TimelineEvent {
  id: string;
  recordId: string; // Actual record ID for editing
  recordType: RecordType;
  record: SleepRecord | FeedingRecord | DiaperRecord;
  category: ActivityCategory;
  startPos: number; // 0-24 position
  endPos: number; // 0-24 position
  label: string;
  duration?: string; // Formatted duration for timed events
  column?: number; // For overlapping events
  icon?: LucideIcon | typeof DiaperIcon; // Icon component for the event
}

export function TimelineTrack({
  sleepRecords,
  feedingRecords,
  diaperRecords,
  selectedDate,
  onEventClick,
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
      recordId: record.id,
      recordType: "SLEEP",
      record,
      category: "sleep",
      startPos,
      endPos: Math.max(endPos, startPos + 0.25), // Minimum 15min display
      label: record.sleepType === "NIGHT" ? "Night" : "Nap",
      duration,
      icon: Moon,
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
    let icon: LucideIcon | typeof DiaperIcon = Baby;
    if (record.feedingType === "BREAST") {
      label = "Breast";
      icon = Baby;
      if (record.endTime) {
        duration = formatDurationPrecise(record.startTime, record.endTime);
      }
    } else if (record.feedingType === "BOTTLE") {
      label = "Bottle";
      icon = Milk;
    } else if (record.feedingType === "SOLIDS") {
      label = "Solids";
      icon = Utensils;
    }

    events.push({
      id: `feeding-${record.id}`,
      recordId: record.id,
      recordType: "FEEDING",
      record,
      category,
      startPos,
      endPos: Math.max(endPos, startPos + 0.25),
      label,
      duration,
      icon,
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
      recordId: record.id,
      recordType: "DIAPER",
      record,
      category: "diaper",
      startPos: pos,
      endPos: pos + 0.25, // 15min display width
      label,
      icon: DiaperIcon,
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
    <div className="relative flex" style={{ height: "1500px" }}>
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
          // Quarter hour = 0.25/24 * 100 = ~1.04% (minimum height for all events)
          const quarterHourPercent = (0.25 / 24) * 100;
          const finalHeight = Math.max(quarterHourPercent, Math.min(height, 100 - top));
          const isSmallBlock = finalHeight < 2; // Less than ~30 min

          return (
            <button
              key={event.id}
              onClick={() => onEventClick?.(event.recordId, event.recordType, event.record)}
              className={`absolute rounded-md flex items-center overflow-hidden text-xs font-medium shadow-sm cursor-pointer hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-all ${getActivityBarClasses(event.category)}`}
              style={{
                top: `${Math.max(0, top)}%`,
                height: `${finalHeight}%`,
                left: `${left}%`,
                width: `${columnWidth - 1}%`,
                minHeight: "16px", // ~1/4 hour at 1500px height
              }}
            >
              <div className="flex-1 flex items-center justify-between px-2 min-w-0 gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  {event.icon && (
                    <event.icon className="h-3.5 w-3.5 flex-shrink-0" />
                  )}
                  {event.label && (
                    <span className="truncate">{event.label}</span>
                  )}
                </div>
                {event.duration && !isSmallBlock && (
                  <span className="truncate text-[10px] opacity-80 ml-1 flex-shrink-0">{event.duration}</span>
                )}
              </div>
            </button>
          );
        })}

        {/* Current time indicator */}
        <CurrentTimeIndicator selectedDate={selectedDate} />
      </div>
    </div>
  );
}

function CurrentTimeIndicator({ selectedDate }: { selectedDate?: Date }) {
  const now = new Date();

  // Only show on today's date
  const isToday = selectedDate
    ? selectedDate.toDateString() === now.toDateString()
    : true;

  if (!isToday) return null;

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
