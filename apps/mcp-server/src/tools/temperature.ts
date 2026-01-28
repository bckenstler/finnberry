import type { PrismaClient } from "@finnberry/db";
import { getDateRange, formatTime, formatTemperature } from "@finnberry/utils";
import {
  parseQueryDates,
  sanitizeLimit,
  sanitizeOffset,
  buildQueryResponse,
  type QueryInput,
} from "./query-helpers.js";

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

    case "query-temperature-records": {
      const {
        childId,
        startDate,
        endDate,
        limit,
        offset,
        orderBy = "desc",
        includeSummary = false,
        feverOnly = false,
      } = args as unknown as QueryInput & {
        feverOnly?: boolean;
      };

      const { start, end } = parseQueryDates(startDate, endDate);
      const safeLimit = sanitizeLimit(limit);
      const safeOffset = sanitizeOffset(offset);

      const where = {
        childId,
        time: { gte: start, lte: end },
        ...(feverOnly ? { temperatureCelsius: { gte: 38.0 } } : {}),
      };

      const [total, records] = await Promise.all([
        prisma.temperatureRecord.count({ where }),
        prisma.temperatureRecord.findMany({
          where,
          orderBy: { time: orderBy },
          skip: safeOffset,
          take: safeLimit,
        }),
      ]);

      // Build summary if requested
      let summary;
      if (includeSummary) {
        const temperatures = records.map((r) => r.temperatureCelsius);
        const avgTemp = temperatures.length > 0
          ? temperatures.reduce((a, b) => a + b, 0) / temperatures.length
          : null;
        const maxTemp = temperatures.length > 0 ? Math.max(...temperatures) : null;
        const minTemp = temperatures.length > 0 ? Math.min(...temperatures) : null;
        const feverCount = records.filter((r) => r.temperatureCelsius >= 38.0).length;
        const lowCount = records.filter((r) => r.temperatureCelsius < 36.0).length;

        summary = {
          totalRecords: records.length,
          averageTemperature: avgTemp ? Number(avgTemp.toFixed(1)) : null,
          averageFormatted: avgTemp ? formatTemperature(avgTemp) : null,
          maxTemperature: maxTemp,
          maxFormatted: maxTemp ? formatTemperature(maxTemp) : null,
          minTemperature: minTemp,
          minFormatted: minTemp ? formatTemperature(minTemp) : null,
          feverReadings: feverCount,
          lowReadings: lowCount,
          normalReadings: records.length - feverCount - lowCount,
        };
      }

      // Map records to output format
      const mappedRecords = records.map((r) => ({
        id: r.id,
        childId: r.childId,
        temperatureCelsius: r.temperatureCelsius,
        temperatureFormatted: formatTemperature(r.temperatureCelsius),
        time: r.time.toISOString(),
        formattedTime: formatTime(r.time),
        isFever: r.temperatureCelsius >= 38.0,
        isLow: r.temperatureCelsius < 36.0,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));

      return buildQueryResponse(mappedRecords, total, safeLimit, safeOffset, start, end, summary);
    }

    default:
      throw new Error(`Unknown temperature tool: ${name}`);
  }
}
