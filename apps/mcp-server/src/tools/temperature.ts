import type { PrismaClient } from "@finnberry/db";
import { getDateRange, formatTime, formatTemperature } from "@finnberry/utils";

export async function handleTemperatureTools(
  name: string,
  args: Record<string, unknown>,
  prisma: PrismaClient
): Promise<unknown> {
  switch (name) {
    case "log-temperature": {
      const { childId, temperatureCelsius, time, notes } = args as {
        childId: string;
        temperatureCelsius: number;
        time?: string;
        notes?: string;
      };

      const record = await prisma.temperatureRecord.create({
        data: {
          childId,
          temperatureCelsius,
          time: time ? new Date(time) : new Date(),
          notes,
        },
      });

      // Determine if temperature is concerning
      const isFever = temperatureCelsius >= 38.0;
      const isLow = temperatureCelsius < 36.0;

      return {
        success: true,
        recordId: record.id,
        temperatureCelsius: record.temperatureCelsius,
        temperatureFormatted: formatTemperature(record.temperatureCelsius),
        time: record.time.toISOString(),
        formattedTime: formatTime(record.time),
        warning: isFever
          ? "Temperature indicates fever (>= 38.0°C)"
          : isLow
            ? "Temperature is below normal (< 36.0°C)"
            : null,
        message: `Recorded temperature: ${formatTemperature(record.temperatureCelsius)}`,
      };
    }

    case "get-temperature-records": {
      const { childId, period = "week" } = args as {
        childId: string;
        period?: "today" | "week" | "month";
      };

      const { start, end } = getDateRange(period);

      const records = await prisma.temperatureRecord.findMany({
        where: {
          childId,
          time: { gte: start, lte: end },
        },
        orderBy: { time: "desc" },
      });

      const temperatures = records.map((r) => r.temperatureCelsius);
      const avgTemp = temperatures.length > 0
        ? temperatures.reduce((a, b) => a + b, 0) / temperatures.length
        : null;
      const maxTemp = temperatures.length > 0 ? Math.max(...temperatures) : null;
      const minTemp = temperatures.length > 0 ? Math.min(...temperatures) : null;
      const feverCount = records.filter((r) => r.temperatureCelsius >= 38.0).length;

      return {
        period,
        totalRecords: records.length,
        statistics: {
          averageTemperature: avgTemp ? Number(avgTemp.toFixed(1)) : null,
          averageFormatted: avgTemp ? formatTemperature(avgTemp) : null,
          maxTemperature: maxTemp,
          maxFormatted: maxTemp ? formatTemperature(maxTemp) : null,
          minTemperature: minTemp,
          minFormatted: minTemp ? formatTemperature(minTemp) : null,
          feverReadings: feverCount,
        },
        records: records.slice(0, 10).map((r) => ({
          id: r.id,
          temperatureCelsius: r.temperatureCelsius,
          temperatureFormatted: formatTemperature(r.temperatureCelsius),
          time: r.time.toISOString(),
          formattedTime: formatTime(r.time),
          isFever: r.temperatureCelsius >= 38.0,
          notes: r.notes,
        })),
      };
    }

    case "get-latest-temperature": {
      const { childId } = args as {
        childId: string;
      };

      const latestRecord = await prisma.temperatureRecord.findFirst({
        where: { childId },
        orderBy: { time: "desc" },
      });

      if (!latestRecord) {
        return {
          found: false,
          message: "No temperature records found for this child",
        };
      }

      const isFever = latestRecord.temperatureCelsius >= 38.0;
      const isLow = latestRecord.temperatureCelsius < 36.0;

      return {
        found: true,
        temperatureCelsius: latestRecord.temperatureCelsius,
        temperatureFormatted: formatTemperature(latestRecord.temperatureCelsius),
        time: latestRecord.time.toISOString(),
        formattedTime: formatTime(latestRecord.time),
        status: isFever ? "fever" : isLow ? "low" : "normal",
        warning: isFever
          ? "Temperature indicates fever (>= 38.0°C)"
          : isLow
            ? "Temperature is below normal (< 36.0°C)"
            : null,
        notes: latestRecord.notes,
      };
    }

    default:
      throw new Error(`Unknown temperature tool: ${name}`);
  }
}
