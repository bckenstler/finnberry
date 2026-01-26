"use client";

import { TimelineAxis } from "@/components/reports/timeline/axis";
import { TimelineBar } from "@/components/reports/timeline/bar";
import {
  normalizeToTimelinePosition,
  DAY_START_HOUR,
} from "@finnberry/utils";
import {
  getActivityBarClasses,
  feedingTypeToCategory,
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

export function TimelineTrack({
  sleepRecords,
  feedingRecords,
  diaperRecords,
  dayStart,
}: TimelineTrackProps) {
  return (
    <div className="relative overflow-x-auto">
      <div className="min-w-[500px]">
      <TimelineAxis />

      {/* Timeline tracks */}
      <div className="ml-12 relative" style={{ height: "200px" }}>
        {/* Sleep track */}
        <div className="absolute left-0 right-0" style={{ top: "0%", height: "30%" }}>
          <div className="text-xs text-muted-foreground mb-1">Sleep</div>
          <div className="relative h-full bg-muted/30 rounded">
            {sleepRecords.map((record) => {
              const startPos = normalizeToTimelinePosition(
                record.startTime,
                DAY_START_HOUR
              );
              const endPos = record.endTime
                ? normalizeToTimelinePosition(record.endTime, DAY_START_HOUR)
                : normalizeToTimelinePosition(new Date(), DAY_START_HOUR);
              const left = (startPos / 24) * 100;
              const width = ((endPos - startPos) / 24) * 100;

              return (
                <TimelineBar
                  key={record.id}
                  category="sleep"
                  left={left}
                  width={width}
                  label={record.sleepType === "NIGHT" ? "Night" : "Nap"}
                />
              );
            })}
          </div>
        </div>

        {/* Feeding track */}
        <div className="absolute left-0 right-0" style={{ top: "35%", height: "30%" }}>
          <div className="text-xs text-muted-foreground mb-1">Feeding</div>
          <div className="relative h-full bg-muted/30 rounded">
            {feedingRecords.map((record) => {
              const startPos = normalizeToTimelinePosition(
                record.startTime,
                DAY_START_HOUR
              );
              const endPos = record.endTime
                ? normalizeToTimelinePosition(record.endTime, DAY_START_HOUR)
                : startPos + 0.5; // Default 30min width for instant records
              const left = (startPos / 24) * 100;
              const width = Math.max(((endPos - startPos) / 24) * 100, 1);
              const category = feedingTypeToCategory(
                record.feedingType as "BREAST" | "BOTTLE" | "SOLIDS"
              );

              let label = record.feedingType;
              if (record.feedingType === "BREAST" && record.side) {
                label = record.side === "LEFT" ? "L" : record.side === "RIGHT" ? "R" : "B";
              } else if (record.feedingType === "BOTTLE" && record.amountMl) {
                label = `${Math.round(record.amountMl / 29.574)}oz`;
              }

              return (
                <TimelineBar
                  key={record.id}
                  category={category}
                  left={left}
                  width={width}
                  label={label}
                />
              );
            })}
          </div>
        </div>

        {/* Diaper track */}
        <div className="absolute left-0 right-0" style={{ top: "70%", height: "25%" }}>
          <div className="text-xs text-muted-foreground mb-1">Diaper</div>
          <div className="relative h-full bg-muted/30 rounded">
            {diaperRecords.map((record) => {
              const pos = normalizeToTimelinePosition(
                record.time,
                DAY_START_HOUR
              );
              const left = (pos / 24) * 100;

              const label =
                record.diaperType === "WET"
                  ? "W"
                  : record.diaperType === "DIRTY"
                    ? "D"
                    : record.diaperType === "BOTH"
                      ? "M"
                      : "";

              return (
                <TimelineBar
                  key={record.id}
                  category="diaper"
                  left={left}
                  width={1.5}
                  label={label}
                />
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
