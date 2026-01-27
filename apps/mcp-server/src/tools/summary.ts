import type { PrismaClient } from "@finnberry/db";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { calculateDurationMinutes, formatDuration, formatTime, formatTemperature, formatWeight, formatHeight } from "@finnberry/utils";

const ACTIVITY_LABELS: Record<string, string> = {
  TUMMY_TIME: "Tummy Time",
  BATH: "Bath",
  OUTDOOR_PLAY: "Outdoor Play",
  INDOOR_PLAY: "Indoor Play",
  SCREEN_TIME: "Screen Time",
  SKIN_TO_SKIN: "Skin to Skin",
  STORYTIME: "Storytime",
  TEETH_BRUSHING: "Teeth Brushing",
  OTHER: "Other Activity",
};

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

      const [
        child,
        sleepRecords,
        feedingRecords,
        diaperRecords,
        pumpingRecords,
        activityRecords,
        temperatureRecords,
        medicineRecords,
        latestGrowth,
      ] = await Promise.all([
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
        prisma.pumpingRecord.findMany({
          where: {
            childId,
            startTime: { gte: start, lte: end },
          },
          orderBy: { startTime: "desc" },
        }),
        prisma.activityRecord.findMany({
          where: {
            childId,
            startTime: { gte: start, lte: end },
          },
          orderBy: { startTime: "desc" },
        }),
        prisma.temperatureRecord.findMany({
          where: {
            childId,
            time: { gte: start, lte: end },
          },
          orderBy: { time: "desc" },
        }),
        prisma.medicineRecord.findMany({
          where: {
            medicine: { childId },
            time: { gte: start, lte: end },
          },
          include: {
            medicine: {
              select: { name: true, dosage: true },
            },
          },
          orderBy: { time: "desc" },
        }),
        prisma.growthRecord.findFirst({
          where: { childId },
          orderBy: { date: "desc" },
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

      // Pumping summary
      const pumpingMinutes = pumpingRecords.reduce((sum, r) => {
        if (!r.endTime) return sum;
        return sum + calculateDurationMinutes(r.startTime, r.endTime);
      }, 0);
      const totalPumpedMl = pumpingRecords.reduce(
        (sum, r) => sum + (r.amountMl ?? 0),
        0
      );

      // Activity summary - group by type
      const activityByType: Record<string, { count: number; totalMinutes: number }> = {};
      activityRecords.forEach((r) => {
        const type = r.activityType;
        if (!activityByType[type]) {
          activityByType[type] = { count: 0, totalMinutes: 0 };
        }
        activityByType[type].count++;
        if (r.endTime) {
          activityByType[type].totalMinutes += calculateDurationMinutes(r.startTime, r.endTime);
        }
      });

      // Temperature summary
      const temperatures = temperatureRecords.map((r) => r.temperatureCelsius);
      const latestTemp = temperatureRecords[0];
      const maxTemp = temperatures.length > 0 ? Math.max(...temperatures) : null;
      const feverReadings = temperatureRecords.filter((r) => r.temperatureCelsius >= 38.0).length;

      // Medicine summary
      const givenMedicines = medicineRecords.filter((r) => !r.skipped);
      const skippedMedicines = medicineRecords.filter((r) => r.skipped);

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

      pumpingRecords.forEach((r) => {
        const duration = r.endTime
          ? formatDuration(calculateDurationMinutes(r.startTime, r.endTime))
          : "ongoing";
        const amount = r.amountMl ? `, ${r.amountMl}ml` : "";
        timeline.push({
          time: formatTime(r.startTime),
          type: "Pumping",
          details: `${duration}${amount}`,
        });
      });

      activityRecords.forEach((r) => {
        const duration = r.endTime
          ? formatDuration(calculateDurationMinutes(r.startTime, r.endTime))
          : "ongoing";
        timeline.push({
          time: formatTime(r.startTime),
          type: ACTIVITY_LABELS[r.activityType] || r.activityType,
          details: duration,
        });
      });

      temperatureRecords.forEach((r) => {
        const isFever = r.temperatureCelsius >= 38.0;
        timeline.push({
          time: formatTime(r.time),
          type: "Temperature",
          details: `${formatTemperature(r.temperatureCelsius)}${isFever ? " (fever)" : ""}`,
        });
      });

      medicineRecords.forEach((r) => {
        timeline.push({
          time: formatTime(r.time),
          type: "Medicine",
          details: r.skipped
            ? `${r.medicine.name} (skipped)`
            : `${r.medicine.name} - ${r.dosageGiven || r.medicine.dosage}`,
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
          pumping: {
            sessions: pumpingRecords.length,
            totalTime: formatDuration(pumpingMinutes),
            totalMl: totalPumpedMl,
          },
          activities: {
            total: activityRecords.length,
            byType: Object.entries(activityByType).map(([type, data]) => ({
              type: ACTIVITY_LABELS[type] || type,
              count: data.count,
              totalTime: formatDuration(data.totalMinutes),
            })),
          },
          temperature: {
            readings: temperatureRecords.length,
            latest: latestTemp
              ? {
                  value: latestTemp.temperatureCelsius,
                  formatted: formatTemperature(latestTemp.temperatureCelsius),
                  time: formatTime(latestTemp.time),
                }
              : null,
            maxToday: maxTemp ? formatTemperature(maxTemp) : null,
            feverReadings,
          },
          medicine: {
            total: medicineRecords.length,
            given: givenMedicines.length,
            skipped: skippedMedicines.length,
            doses: givenMedicines.slice(0, 5).map((r) => ({
              name: r.medicine.name,
              dosage: r.dosageGiven || r.medicine.dosage,
              time: formatTime(r.time),
            })),
          },
          latestGrowth: latestGrowth
            ? {
                date: latestGrowth.date.toISOString().split("T")[0],
                weightKg: latestGrowth.weightKg,
                weightFormatted: latestGrowth.weightKg ? formatWeight(latestGrowth.weightKg) : null,
                heightCm: latestGrowth.heightCm,
                heightFormatted: latestGrowth.heightCm ? formatHeight(latestGrowth.heightCm) : null,
                headCircumferenceCm: latestGrowth.headCircumferenceCm,
              }
            : null,
        },
        timeline: timeline.slice(0, 30),
      };
    }

    default:
      throw new Error(`Unknown summary tool: ${name}`);
  }
}
