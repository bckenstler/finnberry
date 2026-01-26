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
          <div className="flex items-center gap-4 p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
            <Moon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <div className="flex-1">
              <p className="font-semibold text-indigo-900 dark:text-indigo-100">Sleep</p>
              <div className="text-sm text-indigo-700 dark:text-indigo-300">
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

          <div className="flex items-center gap-4 p-3 rounded-lg bg-pink-100 dark:bg-pink-900/50">
            <Baby className="h-8 w-8 text-pink-600 dark:text-pink-400" />
            <div className="flex-1">
              <p className="font-semibold text-pink-900 dark:text-pink-100">Feeding</p>
              <div className="text-sm text-pink-700 dark:text-pink-300">
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

          <div className="flex items-center gap-4 p-3 rounded-lg bg-blue-100 dark:bg-blue-900/50">
            <Droplets className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900 dark:text-blue-100">Diapers</p>
              <div className="text-sm text-blue-700 dark:text-blue-300">
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
