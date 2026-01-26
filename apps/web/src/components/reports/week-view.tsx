"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfWeek,
  addDays,
  format,
  normalizeToTimelinePosition,
  getTimelineHourLabels,
  DAY_START_HOUR,
} from "@finnberry/utils";
import {
  getActivityBarClasses,
  feedingTypeToCategory,
} from "@/lib/activity-colors";

interface WeekViewProps {
  childId: string;
}

export function WeekView({ childId }: WeekViewProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );

  const { data, isLoading } = trpc.timeline.getWeek.useQuery({
    childId,
    weekStart,
  });

  const handlePrevWeek = () => {
    setWeekStart((prev) => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setWeekStart((prev) => addDays(prev, 7));
  };

  const hourLabels = getTimelineHourLabels(DAY_START_HOUR);

  return (
    <div className="space-y-4 mt-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={handlePrevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">
          {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </span>
        <Button variant="outline" size="icon" onClick={handleNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 overflow-x-auto">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">
                Loading week data...
              </div>
            </div>
          ) : data ? (
            <div className="min-w-[600px]">
              {/* Day headers */}
              <div className="flex border-b border-border">
                <div className="w-12 flex-shrink-0" />
                {data.days.map((day) => (
                  <div
                    key={day.date}
                    className="flex-1 text-center py-2 text-sm font-medium"
                  >
                    <div>{format(new Date(day.date), "EEE")}</div>
                    <div className="text-muted-foreground">
                      {format(new Date(day.date), "d")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time grid */}
              <div className="relative" style={{ height: "300px" }}>
                {/* Hour lines */}
                {hourLabels.map((label, i) => (
                  <div
                    key={`${label}-${i}`}
                    className="absolute w-full border-t border-border/50 flex items-start"
                    style={{ top: `${(i / (hourLabels.length - 1)) * 100}%` }}
                  >
                    <span className="w-12 text-xs text-muted-foreground -mt-2 pr-2 text-right">
                      {label}
                    </span>
                  </div>
                ))}

                {/* Day columns with activities */}
                <div className="absolute left-12 right-0 top-0 bottom-0 flex">
                  {data.days.map((day) => (
                    <div
                      key={day.date}
                      className="flex-1 relative border-l border-border/30"
                    >
                      {/* Sleep bars */}
                      {day.sleepRecords.map((record) => {
                        const startPos = normalizeToTimelinePosition(
                          record.startTime,
                          DAY_START_HOUR
                        );
                        const endPos = record.endTime
                          ? normalizeToTimelinePosition(
                              record.endTime,
                              DAY_START_HOUR
                            )
                          : normalizeToTimelinePosition(
                              new Date(),
                              DAY_START_HOUR
                            );
                        const top = (startPos / 24) * 100;
                        const height = ((endPos - startPos) / 24) * 100;

                        return (
                          <div
                            key={record.id}
                            className={`absolute left-1 right-1 rounded-sm ${getActivityBarClasses("sleep")}`}
                            style={{
                              top: `${Math.max(0, top)}%`,
                              height: `${Math.max(2, Math.min(height, 100 - top))}%`,
                            }}
                          />
                        );
                      })}

                      {/* Feeding markers */}
                      {day.feedingRecords.map((record) => {
                        const pos = normalizeToTimelinePosition(
                          record.startTime,
                          DAY_START_HOUR
                        );
                        const top = (pos / 24) * 100;
                        const category = feedingTypeToCategory(
                          record.feedingType as "BREAST" | "BOTTLE" | "SOLIDS"
                        );

                        return (
                          <div
                            key={record.id}
                            className={`absolute left-1 right-1 h-2 rounded-sm ${getActivityBarClasses(category)}`}
                            style={{ top: `${top}%` }}
                          />
                        );
                      })}

                      {/* Diaper markers */}
                      {day.diaperRecords.map((record) => {
                        const pos = normalizeToTimelinePosition(
                          record.time,
                          DAY_START_HOUR
                        );
                        const top = (pos / 24) * 100;

                        return (
                          <div
                            key={record.id}
                            className={`absolute left-1 right-1 h-1.5 rounded-sm ${getActivityBarClasses("diaper")}`}
                            style={{ top: `${top}%` }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data for this week
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
