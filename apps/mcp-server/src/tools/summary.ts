import type { PrismaClient } from "@finnberry/db";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { calculateDurationMinutes, formatDuration, formatTime } from "@finnberry/utils";

export async function handleSummaryTools(
  name: string,
  args: Record<string, unknown>,
  prisma: PrismaClient
): Promise<unknown> {
  switch (name) {
    case "get-daily-summary": {
      const { childId, date } = args as {
        childId: string;
        date?: string;
      };

      const targetDate = date ? parseISO(date) : new Date();
      const start = startOfDay(targetDate);
      const end = endOfDay(targetDate);

      const [child, sleepRecords, feedingRecords, diaperRecords] =
        await Promise.all([
          prisma.child.findUnique({
            where: { id: childId },
            select: { name: true, birthDate: true },
          }),
          prisma.sleepRecord.findMany({
            where: {
              childId,
              startTime: { gte: start, lte: end },
            },
            orderBy: { startTime: "desc" },
          }),
          prisma.feedingRecord.findMany({
            where: {
              childId,
              startTime: { gte: start, lte: end },
            },
            orderBy: { startTime: "desc" },
          }),
          prisma.diaperRecord.findMany({
            where: {
              childId,
              time: { gte: start, lte: end },
            },
            orderBy: { time: "desc" },
          }),
        ]);

      if (!child) {
        throw new Error("Child not found");
      }

      // Sleep summary
      const totalSleepMinutes = sleepRecords.reduce((sum, r) => {
        if (!r.endTime) return sum;
        return sum + calculateDurationMinutes(r.startTime, r.endTime);
      }, 0);

      const napRecords = sleepRecords.filter((r) => r.sleepType === "NAP");
      const nightRecords = sleepRecords.filter((r) => r.sleepType === "NIGHT");

      // Feeding summary
      const breastRecords = feedingRecords.filter((r) => r.feedingType === "BREAST");
      const bottleRecords = feedingRecords.filter((r) => r.feedingType === "BOTTLE");
      const solidsRecords = feedingRecords.filter((r) => r.feedingType === "SOLIDS");

      const breastMinutes = breastRecords.reduce((sum, r) => {
        if (!r.endTime) return sum;
        return sum + calculateDurationMinutes(r.startTime, r.endTime);
      }, 0);

      const totalBottleMl = bottleRecords.reduce(
        (sum, r) => sum + (r.amountMl ?? 0),
        0
      );

      // Diaper summary
      const wetCount = diaperRecords.filter(
        (r) => r.diaperType === "WET" || r.diaperType === "BOTH"
      ).length;
      const dirtyCount = diaperRecords.filter(
        (r) => r.diaperType === "DIRTY" || r.diaperType === "BOTH"
      ).length;

      // Build timeline
      const timeline: Array<{
        time: string;
        type: string;
        details: string;
      }> = [];

      sleepRecords.forEach((r) => {
        const duration = r.endTime
          ? formatDuration(calculateDurationMinutes(r.startTime, r.endTime))
          : "ongoing";
        timeline.push({
          time: formatTime(r.startTime),
          type: r.sleepType === "NAP" ? "Nap" : "Night Sleep",
          details: duration,
        });
      });

      feedingRecords.forEach((r) => {
        let details = "";
        if (r.feedingType === "BREAST") {
          const duration = r.endTime
            ? formatDuration(calculateDurationMinutes(r.startTime, r.endTime))
            : "ongoing";
          details = `${r.side} side, ${duration}`;
        } else if (r.feedingType === "BOTTLE") {
          details = `${r.amountMl}ml`;
        } else {
          details = r.foodItems.join(", ");
        }
        timeline.push({
          time: formatTime(r.startTime),
          type:
            r.feedingType === "BREAST"
              ? "Breastfeeding"
              : r.feedingType === "BOTTLE"
                ? "Bottle"
                : "Solids",
          details,
        });
      });

      diaperRecords.forEach((r) => {
        timeline.push({
          time: formatTime(r.time),
          type: "Diaper",
          details: r.diaperType.toLowerCase() + (r.color ? `, ${r.color.toLowerCase()}` : ""),
        });
      });

      // Sort timeline by time (most recent first)
      timeline.sort((a, b) => {
        const timeA = new Date(`1970-01-01 ${a.time}`);
        const timeB = new Date(`1970-01-01 ${b.time}`);
        return timeB.getTime() - timeA.getTime();
      });

      return {
        child: {
          name: child.name,
          birthDate: child.birthDate.toISOString().split("T")[0],
        },
        date: targetDate.toISOString().split("T")[0],
        summary: {
          sleep: {
            totalTime: formatDuration(totalSleepMinutes),
            totalMinutes: totalSleepMinutes,
            naps: napRecords.length,
            nightSleep: nightRecords.length,
          },
          feeding: {
            total: feedingRecords.length,
            breastfeeding: {
              count: breastRecords.length,
              totalTime: formatDuration(breastMinutes),
            },
            bottle: {
              count: bottleRecords.length,
              totalMl: totalBottleMl,
            },
            solids: solidsRecords.length,
          },
          diapers: {
            total: diaperRecords.length,
            wet: wetCount,
            dirty: dirtyCount,
          },
        },
        timeline: timeline.slice(0, 20),
      };
    }

    default:
      throw new Error(`Unknown summary tool: ${name}`);
  }
}
