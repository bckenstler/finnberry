import type { PrismaClient } from "@finnberry/db";
import { getDateRange, formatDuration } from "@finnberry/utils";
import {
  buildStartResponse,
  buildEndResponse,
  buildLogResponse,
  calculateTotalMinutes,
  mapRecentRecords,
} from "./helpers.js";
import {
  parseQueryDates,
  sanitizeLimit,
  sanitizeOffset,
  buildQueryResponse,
  type QueryInput,
} from "./query-helpers.js";

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

      return buildStartResponse(
        "sleepId",
        sleep.id,
        `Started ${sleepType.toLowerCase()} timer for child`,
        sleep.startTime
      );
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

      return buildEndResponse("sleepId", sleep.id, sleep.startTime, sleep.endTime!, {
        sleepType: sleep.sleepType,
        quality: sleep.quality,
      });
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

      return buildLogResponse("sleepId", sleep.id, sleep.startTime, sleep.endTime, {
        sleepType: sleep.sleepType,
      });
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

      const totalMinutes = calculateTotalMinutes(records);
      const napRecords = records.filter((r) => r.sleepType === "NAP");
      const nightRecords = records.filter((r) => r.sleepType === "NIGHT");
      const napMinutes = calculateTotalMinutes(napRecords);
      const nightMinutes = calculateTotalMinutes(nightRecords);

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
        recentSessions: mapRecentRecords(records, 5, (r) => ({
          type: r.sleepType,
          quality: r.quality,
        })),
      };
    }

    case "query-sleep-records": {
      const {
        childId,
        startDate,
        endDate,
        limit,
        offset,
        orderBy = "desc",
        includeSummary = false,
        sleepType,
        completedOnly = false,
      } = args as unknown as QueryInput & {
        sleepType?: "NAP" | "NIGHT";
        completedOnly?: boolean;
      };

      const { start, end } = parseQueryDates(startDate, endDate);
      const safeLimit = sanitizeLimit(limit);
      const safeOffset = sanitizeOffset(offset);

      const where = {
        childId,
        startTime: { gte: start, lte: end },
        ...(sleepType ? { sleepType } : {}),
        ...(completedOnly ? { endTime: { not: null } } : {}),
      };

      const [total, records] = await Promise.all([
        prisma.sleepRecord.count({ where }),
        prisma.sleepRecord.findMany({
          where,
          orderBy: { startTime: orderBy },
          skip: safeOffset,
          take: safeLimit,
        }),
      ]);

      // Build summary if requested
      let summary;
      if (includeSummary) {
        const completedRecords = records.filter((r) => r.endTime !== null);
        const napRecords = completedRecords.filter((r) => r.sleepType === "NAP");
        const nightRecords = completedRecords.filter((r) => r.sleepType === "NIGHT");
        const totalMinutes = calculateTotalMinutes(completedRecords);
        const napMinutes = calculateTotalMinutes(napRecords);
        const nightMinutes = calculateTotalMinutes(nightRecords);

        summary = {
          totalSleep: formatDuration(totalMinutes),
          totalMinutes,
          totalSessions: records.length,
          completedSessions: completedRecords.length,
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
          averageQuality: completedRecords.length > 0
            ? Number((completedRecords.reduce((sum, r) => sum + (r.quality ?? 0), 0) / completedRecords.filter((r) => r.quality !== null).length).toFixed(1)) || null
            : null,
        };
      }

      // Map records to output format
      const mappedRecords = records.map((r) => ({
        id: r.id,
        childId: r.childId,
        sleepType: r.sleepType,
        startTime: r.startTime.toISOString(),
        endTime: r.endTime?.toISOString() ?? null,
        durationMinutes: r.endTime
          ? Math.round((r.endTime.getTime() - r.startTime.getTime()) / 60000)
          : null,
        quality: r.quality,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));

      return buildQueryResponse(mappedRecords, total, safeLimit, safeOffset, start, end, summary);
    }

    default:
      throw new Error(`Unknown sleep tool: ${name}`);
  }
}
