"use client";

import { trpc } from "@/lib/trpc/provider";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration, mlToOz } from "@finnberry/utils";
import { startOfDay, endOfDay } from "@finnberry/utils";
import { Moon, Baby, Milk, Droplets } from "lucide-react";

interface DaySummaryStatsProps {
  childId: string;
  date: Date;
}

export function DaySummaryStats({ childId, date }: DaySummaryStatsProps) {
  const dateRange = {
    start: startOfDay(date),
    end: endOfDay(date),
  };

  const { data: sleepData } = trpc.sleep.list.useQuery({
    childId,
    dateRange,
  });

  const { data: feedingData } = trpc.feeding.list.useQuery({
    childId,
    dateRange,
  });

  const { data: diaperData } = trpc.diaper.list.useQuery({
    childId,
    dateRange,
  });

  // Calculate sleep totals
  const sleepMinutes =
    sleepData?.reduce((sum, record) => {
      if (!record.endTime) return sum;
      const duration =
        (new Date(record.endTime).getTime() -
          new Date(record.startTime).getTime()) /
        60000;
      return sum + duration;
    }, 0) ?? 0;

  // Calculate feeding totals
  const breastRecords =
    feedingData?.filter((r) => r.feedingType === "BREAST") ?? [];
  const breastMinutes = breastRecords.reduce((sum, record) => {
    if (!record.endTime) return sum;
    const duration =
      (new Date(record.endTime).getTime() -
        new Date(record.startTime).getTime()) /
      60000;
    return sum + duration;
  }, 0);

  const bottleRecords =
    feedingData?.filter((r) => r.feedingType === "BOTTLE") ?? [];
  const totalBottleMl = bottleRecords.reduce(
    (sum, r) => sum + (r.amountMl ?? 0),
    0
  );

  const totalFeedings = feedingData?.length ?? 0;
  const totalDiapers = diaperData?.length ?? 0;

  const stats = [
    {
      icon: Moon,
      label: "Sleep",
      value: formatDuration(Math.round(sleepMinutes)),
      color: "text-cyan-500",
    },
    {
      icon: Baby,
      label: "Nursing",
      value: formatDuration(Math.round(breastMinutes)),
      color: "text-orange-400",
    },
    {
      icon: Milk,
      label: "Bottle",
      value: totalBottleMl > 0 ? `${Math.round(mlToOz(totalBottleMl))}oz` : "0oz",
      color: "text-orange-500",
    },
    {
      icon: Baby,
      label: "Feedings",
      value: String(totalFeedings),
      color: "text-orange-400",
    },
    {
      icon: Droplets,
      label: "Diapers",
      value: String(totalDiapers),
      color: "text-yellow-500",
    },
  ];

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex justify-around">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <stat.icon className={`h-4 w-4 ${stat.color} mb-1`} />
              <span className="text-sm font-semibold">{stat.value}</span>
              <span className="text-xs text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
