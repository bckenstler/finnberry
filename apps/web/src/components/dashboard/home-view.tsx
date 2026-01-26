"use client";

import { trpc } from "@/lib/trpc/provider";
import { ActiveTimers } from "@/components/tracking/active-timers";
import {
  ActivityCard,
  formatSleepDetails,
  formatNursingDetails,
  formatBottleDetails,
  formatDiaperDetails,
} from "@/components/dashboard/activity-card";

interface HomeViewProps {
  childId: string;
}

export function HomeView({ childId }: HomeViewProps) {
  const { data: lastActivities, isLoading } =
    trpc.timeline.getLastActivities.useQuery({ childId });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-24 bg-muted animate-pulse rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  const {
    lastSleep,
    activeSleep,
    lastBreastfeeding,
    activeFeeding,
    lastBottle,
    lastDiaper,
  } = lastActivities ?? {};

  // Determine the effective "last" time for each category
  const sleepLastTime = lastSleep?.endTime ?? lastSleep?.startTime ?? null;
  const nursingLastTime =
    lastBreastfeeding?.endTime ?? lastBreastfeeding?.startTime ?? null;
  const bottleLastTime = lastBottle?.startTime ?? null;
  const diaperLastTime = lastDiaper?.time ?? null;

  return (
    <div className="space-y-6">
      {/* Active timers at top */}
      <ActiveTimers childId={childId} />

      {/* Activity cards grid - 2 cols on mobile, 2 on tablet, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <ActivityCard
          category="sleep"
          childId={childId}
          lastTime={sleepLastTime}
          details={formatSleepDetails(lastSleep ?? null)}
          isActive={!!activeSleep}
          activeLabel="Sleeping"
        />

        <ActivityCard
          category="nursing"
          childId={childId}
          lastTime={nursingLastTime}
          details={formatNursingDetails(lastBreastfeeding ?? null)}
          isActive={!!activeFeeding}
          activeLabel={
            activeFeeding?.side === "LEFT"
              ? "Nursing (L)"
              : activeFeeding?.side === "RIGHT"
                ? "Nursing (R)"
                : "Nursing"
          }
        />

        <ActivityCard
          category="bottle"
          childId={childId}
          lastTime={bottleLastTime}
          details={formatBottleDetails(lastBottle ?? null)}
        />

        <ActivityCard
          category="diaper"
          childId={childId}
          lastTime={diaperLastTime}
          details={formatDiaperDetails(lastDiaper ?? null)}
        />
      </div>
    </div>
  );
}
