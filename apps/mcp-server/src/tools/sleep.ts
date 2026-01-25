import type { PrismaClient } from "@finnberry/db";
import { getDateRange, calculateDurationMinutes, formatDuration } from "@finnberry/utils";

export async function handleSleepTools(
  name: string,
  args: Record<string, unknown>,
  prisma: PrismaClient
): Promise<unknown> {
  switch (name) {
    case "start-sleep": {
      const { childId, sleepType = "NAP" } = args as {
        childId: string;
        sleepType?: "NAP" | "NIGHT";
      };

      const existingActive = await prisma.sleepRecord.findFirst({
        where: { childId, endTime: null },
      });

      if (existingActive) {
        throw new Error("There is already an active sleep session for this child");
      }

      const sleep = await prisma.sleepRecord.create({
        data: {
          childId,
          startTime: new Date(),
          sleepType,
        },
      });

      return {
        success: true,
        sleepId: sleep.id,
        message: `Started ${sleepType.toLowerCase()} timer for child`,
        startTime: sleep.startTime.toISOString(),
      };
    }

    case "end-sleep": {
      const { sleepId, quality, notes } = args as {
        sleepId: string;
        quality?: number;
        notes?: string;
      };

      const sleep = await prisma.sleepRecord.update({
        where: { id: sleepId },
        data: {
          endTime: new Date(),
          quality,
          notes,
        },
      });

      const duration = calculateDurationMinutes(sleep.startTime, sleep.endTime!);

      return {
        success: true,
        sleepId: sleep.id,
        duration: formatDuration(duration),
        durationMinutes: duration,
        sleepType: sleep.sleepType,
        quality: sleep.quality,
      };
    }

    case "log-sleep": {
      const { childId, startTime, endTime, sleepType = "NAP", quality } = args as {
        childId: string;
        startTime: string;
        endTime: string;
        sleepType?: "NAP" | "NIGHT";
        quality?: number;
      };

      const sleep = await prisma.sleepRecord.create({
        data: {
          childId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          sleepType,
          quality,
        },
      });

      const duration = calculateDurationMinutes(sleep.startTime, sleep.endTime!);

      return {
        success: true,
        sleepId: sleep.id,
        duration: formatDuration(duration),
        sleepType: sleep.sleepType,
      };
    }

    case "get-sleep-summary": {
      const { childId, period = "today" } = args as {
        childId: string;
        period?: "today" | "week" | "month";
      };

      const { start, end } = getDateRange(period);

      const records = await prisma.sleepRecord.findMany({
        where: {
          childId,
          startTime: { gte: start, lte: end },
          endTime: { not: null },
        },
        orderBy: { startTime: "desc" },
      });

      const totalMinutes = records.reduce((sum, r) => {
        if (!r.endTime) return sum;
        return sum + calculateDurationMinutes(r.startTime, r.endTime);
      }, 0);

      const napRecords = records.filter((r) => r.sleepType === "NAP");
      const nightRecords = records.filter((r) => r.sleepType === "NIGHT");

      const napMinutes = napRecords.reduce((sum, r) => {
        if (!r.endTime) return sum;
        return sum + calculateDurationMinutes(r.startTime, r.endTime);
      }, 0);

      const nightMinutes = nightRecords.reduce((sum, r) => {
        if (!r.endTime) return sum;
        return sum + calculateDurationMinutes(r.startTime, r.endTime);
      }, 0);

      return {
        period,
        totalSleep: formatDuration(totalMinutes),
        totalMinutes,
        totalSessions: records.length,
        naps: {
          count: napRecords.length,
          totalTime: formatDuration(napMinutes),
          totalMinutes: napMinutes,
        },
        nightSleep: {
          count: nightRecords.length,
          totalTime: formatDuration(nightMinutes),
          totalMinutes: nightMinutes,
        },
        recentSessions: records.slice(0, 5).map((r) => ({
          id: r.id,
          type: r.sleepType,
          startTime: r.startTime.toISOString(),
          endTime: r.endTime?.toISOString(),
          duration: r.endTime
            ? formatDuration(calculateDurationMinutes(r.startTime, r.endTime))
            : "ongoing",
          quality: r.quality,
        })),
      };
    }

    default:
      throw new Error(`Unknown sleep tool: ${name}`);
  }
}
