"use client";

import { trpc } from "@/lib/trpc/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@finnberry/utils";
import { Moon, Baby, Droplets } from "lucide-react";

interface DailySummaryProps {
  childId: string;
}

export function DailySummary({ childId }: DailySummaryProps) {
  const { data: sleepSummary } = trpc.sleep.summary.useQuery({
    childId,
    period: "today",
  });

  const { data: feedingSummary } = trpc.feeding.summary.useQuery({
    childId,
    period: "today",
  });

  const { data: diaperSummary } = trpc.diaper.summary.useQuery({
    childId,
    period: "today",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 rounded-lg bg-indigo-100 dark:bg-indigo-950/30">
            <Moon className="h-8 w-8 text-indigo-500" />
            <div className="flex-1">
              <p className="font-semibold">Sleep</p>
              <div className="text-sm text-muted-foreground">
                {sleepSummary ? (
                  <>
                    <p>
                      Total: {formatDuration(sleepSummary.totalMinutes)} ({sleepSummary.totalSessions} sessions)
                    </p>
                    <p>
                      Naps: {formatDuration(sleepSummary.napMinutes)} ({sleepSummary.napCount})
                      {" | "}
                      Night: {formatDuration(sleepSummary.nightMinutes)} ({sleepSummary.nightCount})
                    </p>
                  </>
                ) : (
                  "No sleep recorded"
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 rounded-lg bg-pink-100 dark:bg-pink-950/30">
            <Baby className="h-8 w-8 text-pink-500" />
            <div className="flex-1">
              <p className="font-semibold">Feeding</p>
              <div className="text-sm text-muted-foreground">
                {feedingSummary ? (
                  <>
                    <p>Total: {feedingSummary.totalFeedings} feedings</p>
                    <p>
                      Breast: {feedingSummary.breastfeedingCount} ({formatDuration(feedingSummary.breastfeedingMinutes)})
                      {feedingSummary.bottleCount > 0 && ` | Bottle: ${feedingSummary.bottleCount} (${feedingSummary.totalBottleMl}ml)`}
                      {feedingSummary.solidsCount > 0 && ` | Solids: ${feedingSummary.solidsCount}`}
                    </p>
                  </>
                ) : (
                  "No feedings recorded"
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 rounded-lg bg-blue-100 dark:bg-blue-950/30">
            <Droplets className="h-8 w-8 text-blue-500" />
            <div className="flex-1">
              <p className="font-semibold">Diapers</p>
              <div className="text-sm text-muted-foreground">
                {diaperSummary ? (
                  <>
                    <p>Total: {diaperSummary.totalChanges} changes</p>
                    <p>
                      Wet: {diaperSummary.wetCount} | Dirty: {diaperSummary.dirtyCount}
                    </p>
                  </>
                ) : (
                  "No diapers recorded"
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
