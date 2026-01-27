"use client";

import { trpc } from "@/lib/trpc/provider";
import {
  ActivityCard,
  formatSleepDetails,
  formatNursingDetails,
  formatBottleDetails,
  formatDiaperDetails,
  formatSolidsDetails,
  formatPumpingDetails,
  formatMedicineDetails,
  formatGrowthDetails,
  formatTemperatureDetails,
  formatActivityDetails,
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
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
    lastSolids,
    lastDiaper,
    lastPumping,
    activePumping,
    lastMedicine,
    lastGrowth,
    lastTemperature,
    lastActivity,
  } = lastActivities ?? {};

  // Determine the effective "last" time for each category
  const sleepLastTime = lastSleep?.endTime ?? lastSleep?.startTime ?? null;
  const nursingLastTime =
    lastBreastfeeding?.endTime ?? lastBreastfeeding?.startTime ?? null;
  const bottleLastTime = lastBottle?.startTime ?? null;
  const solidsLastTime = lastSolids?.startTime ?? null;
  const diaperLastTime = lastDiaper?.time ?? null;
  const pumpingLastTime = lastPumping?.endTime ?? lastPumping?.startTime ?? null;
  const medicineLastTime = lastMedicine?.time ?? null;
  const growthLastTime = lastGrowth?.date ?? null;
  const temperatureLastTime = lastTemperature?.time ?? null;
  const activityLastTime = lastActivity?.endTime ?? lastActivity?.startTime ?? null;

  return (
    <div className="space-y-6">
      {/* Activity cards grid - 2 cols on mobile, 3 on tablet, 5 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
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
          category="solids"
          childId={childId}
          lastTime={solidsLastTime}
          details={formatSolidsDetails(lastSolids ?? null)}
        />

        <ActivityCard
          category="diaper"
          childId={childId}
          lastTime={diaperLastTime}
          details={formatDiaperDetails(lastDiaper ?? null)}
        />

        <ActivityCard
          category="pumping"
          childId={childId}
          lastTime={pumpingLastTime}
          details={formatPumpingDetails(lastPumping ?? null)}
          isActive={!!activePumping}
          activeLabel="Pumping"
        />

        <ActivityCard
          category="medicine"
          childId={childId}
          lastTime={medicineLastTime}
          details={formatMedicineDetails(lastMedicine ?? null)}
        />

        <ActivityCard
          category="growth"
          childId={childId}
          lastTime={growthLastTime}
          details={formatGrowthDetails(lastGrowth ?? null)}
        />

        <ActivityCard
          category="temperature"
          childId={childId}
          lastTime={temperatureLastTime}
          details={formatTemperatureDetails(lastTemperature ?? null)}
        />

        <ActivityCard
          category="activity"
          childId={childId}
          lastTime={activityLastTime}
          details={formatActivityDetails(lastActivity ?? null)}
        />
      </div>
    </div>
  );
}
