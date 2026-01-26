"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/provider";
import { Card, CardContent } from "@/components/ui/card";
import { WeekCalendarStrip } from "@/components/reports/week-calendar-strip";
import { DaySummaryStats } from "@/components/reports/day-summary-stats";
import { TimelineTrack } from "@/components/reports/timeline/track";
import { startOfDay } from "@finnberry/utils";

interface DayViewProps {
  childId: string;
}

export function DayView({ childId }: DayViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data, isLoading } = trpc.timeline.getDay.useQuery({
    childId,
    date: selectedDate,
  });

  return (
    <div className="space-y-4 mt-4">
      <WeekCalendarStrip
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
      />

      <DaySummaryStats childId={childId} date={selectedDate} />

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">
                Loading timeline...
              </div>
            </div>
          ) : data ? (
            <TimelineTrack
              sleepRecords={data.sleepRecords}
              feedingRecords={data.feedingRecords}
              diaperRecords={data.diaperRecords}
              dayStart={data.dayStart}
            />
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              No data for this day
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
