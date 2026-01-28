"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/provider";
import { Card, CardContent } from "@/components/ui/card";
import { WeekCalendarStrip } from "@/components/reports/week-calendar-strip";
import { DaySummaryStats } from "@/components/reports/day-summary-stats";
import {
  TimelineTrack,
  type RecordType,
  type SleepRecord,
  type FeedingRecord,
  type DiaperRecord,
  type PumpingRecord,
  type MedicineRecord,
  type GrowthRecord,
  type TemperatureRecord,
  type ActivityRecord,
} from "@/components/reports/timeline/track";
import { ActivityRow } from "@/components/reports/activity-row";

interface DayViewProps {
  childId: string;
}

type Activity =
  | { type: "SLEEP"; record: SleepRecord; time: Date }
  | { type: "FEEDING"; record: FeedingRecord; time: Date }
  | { type: "DIAPER"; record: DiaperRecord; time: Date }
  | { type: "PUMPING"; record: PumpingRecord; time: Date }
  | { type: "MEDICINE"; record: MedicineRecord; time: Date }
  | { type: "GROWTH"; record: GrowthRecord; time: Date }
  | { type: "TEMPERATURE"; record: TemperatureRecord; time: Date }
  | { type: "ACTIVITY"; record: ActivityRecord; time: Date };

export function DayView({ childId }: DayViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const { data: childData } = trpc.child.get.useQuery({ id: childId });
  const { data, isLoading } = trpc.timeline.getDay.useQuery({
    childId,
    date: selectedDate,
  });

  const childName = childData?.name ?? "Baby";

  const handleEventClick = (
    recordId: string,
    recordType: RecordType,
    record: SleepRecord | FeedingRecord | DiaperRecord | PumpingRecord | MedicineRecord | GrowthRecord | TemperatureRecord | ActivityRecord
  ) => {
    // Create activity object matching ActivityRow's expected format
    if (recordType === "SLEEP") {
      const sleepRecord = record as SleepRecord;
      setSelectedActivity({
        type: "SLEEP",
        record: sleepRecord,
        time: new Date(sleepRecord.startTime),
      });
    } else if (recordType === "FEEDING") {
      const feedingRecord = record as FeedingRecord;
      setSelectedActivity({
        type: "FEEDING",
        record: feedingRecord,
        time: new Date(feedingRecord.startTime),
      });
    } else if (recordType === "DIAPER") {
      const diaperRecord = record as DiaperRecord;
      setSelectedActivity({
        type: "DIAPER",
        record: diaperRecord,
        time: new Date(diaperRecord.time),
      });
    } else if (recordType === "PUMPING") {
      const pumpingRecord = record as PumpingRecord;
      setSelectedActivity({
        type: "PUMPING",
        record: pumpingRecord,
        time: new Date(pumpingRecord.startTime),
      });
    } else if (recordType === "MEDICINE") {
      const medicineRecord = record as MedicineRecord;
      setSelectedActivity({
        type: "MEDICINE",
        record: medicineRecord,
        time: new Date(medicineRecord.time),
      });
    } else if (recordType === "GROWTH") {
      const growthRecord = record as GrowthRecord;
      setSelectedActivity({
        type: "GROWTH",
        record: growthRecord,
        time: new Date(growthRecord.date),
      });
    } else if (recordType === "TEMPERATURE") {
      const temperatureRecord = record as TemperatureRecord;
      setSelectedActivity({
        type: "TEMPERATURE",
        record: temperatureRecord,
        time: new Date(temperatureRecord.time),
      });
    } else if (recordType === "ACTIVITY") {
      const activityRecord = record as ActivityRecord;
      setSelectedActivity({
        type: "ACTIVITY",
        record: activityRecord,
        time: new Date(activityRecord.startTime),
      });
    }
  };

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
              pumpingRecords={data.pumpingRecords}
              medicineRecords={data.medicineRecords}
              growthRecords={data.growthRecords}
              temperatureRecords={data.temperatureRecords}
              activityRecords={data.activityRecords}
              dayStart={data.dayStart}
              selectedDate={selectedDate}
              onEventClick={handleEventClick}
            />
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              No data for this day
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden ActivityRow for edit modal - renders only when an activity is selected */}
      {selectedActivity && (
        <div className="hidden">
          <ActivityRowModal
            activity={selectedActivity}
            childId={childId}
            childName={childName}
            onClose={() => setSelectedActivity(null)}
          />
        </div>
      )}
    </div>
  );
}

// Component that auto-opens the ActivityRow edit dialog
function ActivityRowModal({
  activity,
  childId,
  childName,
  onClose,
}: {
  activity: Activity;
  childId: string;
  childName: string;
  onClose: () => void;
}) {
  // This is a workaround - we render ActivityRow but intercept its close
  // The ActivityRow component manages its own dialog state
  return (
    <ActivityRow
      activity={activity}
      childId={childId}
      childName={childName}
      autoOpenEdit
      onEditClose={onClose}
    />
  );
}
