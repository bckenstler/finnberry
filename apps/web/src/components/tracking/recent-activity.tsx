"use client";

import { trpc } from "@/lib/trpc/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime, formatDuration, calculateDurationMinutes } from "@finnberry/utils";
import { Moon, Baby, Droplets, Milk, Dumbbell } from "lucide-react";

interface RecentActivityProps {
  childId: string;
}

type ActivityItem = {
  id: string;
  type: "sleep" | "feeding" | "diaper" | "pumping" | "activity";
  time: Date;
  details: string;
  subDetails?: string;
};

export function RecentActivity({ childId }: RecentActivityProps) {
  const { data: sleepRecords } = trpc.sleep.list.useQuery({
    childId,
    period: "today",
  });

  const { data: feedingRecords } = trpc.feeding.list.useQuery({
    childId,
    period: "today",
  });

  const { data: diaperRecords } = trpc.diaper.list.useQuery({
    childId,
    period: "today",
  });

  const activities: ActivityItem[] = [];

  sleepRecords?.forEach((record) => {
    const duration = record.endTime
      ? calculateDurationMinutes(record.startTime, record.endTime)
      : null;
    activities.push({
      id: `sleep-${record.id}`,
      type: "sleep",
      time: record.startTime,
      details: record.sleepType === "NAP" ? "Nap" : "Night Sleep",
      subDetails: duration !== null ? formatDuration(duration) : "In progress",
    });
  });

  feedingRecords?.forEach((record) => {
    let details = "";
    let subDetails = "";

    if (record.feedingType === "BREAST") {
      details = `Breastfeeding (${record.side})`;
      if (record.endTime) {
        const duration = calculateDurationMinutes(record.startTime, record.endTime);
        subDetails = formatDuration(duration);
      } else {
        subDetails = "In progress";
      }
    } else if (record.feedingType === "BOTTLE") {
      details = "Bottle";
      subDetails = `${record.amountMl}ml`;
    } else {
      details = "Solids";
      subDetails = record.foodItems?.join(", ") || "";
    }

    activities.push({
      id: `feeding-${record.id}`,
      type: "feeding",
      time: record.startTime,
      details,
      subDetails,
    });
  });

  diaperRecords?.forEach((record) => {
    activities.push({
      id: `diaper-${record.id}`,
      type: "diaper",
      time: record.time,
      details: `Diaper - ${record.diaperType.toLowerCase()}`,
      subDetails: record.color ? record.color.toLowerCase() : undefined,
    });
  });

  activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const recentActivities = activities.slice(0, 10);

  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "sleep":
        return <Moon className="h-4 w-4 text-indigo-500" />;
      case "feeding":
        return <Baby className="h-4 w-4 text-pink-500" />;
      case "diaper":
        return <Droplets className="h-4 w-4 text-blue-500" />;
      case "pumping":
        return <Milk className="h-4 w-4 text-purple-500" />;
      case "activity":
        return <Dumbbell className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {recentActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity logged today
          </p>
        ) : (
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  {getIcon(activity.type)}
                  <div>
                    <p className="font-medium text-sm">{activity.details}</p>
                    {activity.subDetails && (
                      <p className="text-xs text-muted-foreground">
                        {activity.subDetails}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatTime(activity.time)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
