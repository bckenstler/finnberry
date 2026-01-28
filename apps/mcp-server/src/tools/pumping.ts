import type { PrismaClient } from "@finnberry/db";
import { getDateRange, formatDuration } from "@finnberry/utils";
import {
  buildStartResponse,
  buildEndResponse,
  buildLogResponse,
  calculateTotalMinutes,
  getCompletedRecords,
  mapRecentRecords,
} from "./helpers.js";
import {
  parseQueryDates,
  sanitizeLimit,
  sanitizeOffset,
  buildQueryResponse,
  type QueryInput,
} from "./query-helpers.js";

export async function handlePumpingTools(
  name: string,
  args: Record<string, unknown>,
  prisma: PrismaClient
): Promise<unknown> {
  switch (name) {
    case "start-pumping": {
      const { childId } = args as {
        childId: string;
      };

      const existingActive = await prisma.pumpingRecord.findFirst({
        where: { childId, endTime: null },
      });

      if (existingActive) {
        throw new Error("There is already an active pumping session for this child");
      }

      const pumping = await prisma.pumpingRecord.create({
        data: {
          childId,
          startTime: new Date(),
        },
      });

      return buildStartResponse(
        "pumpingId",
        pumping.id,
        "Started pumping timer",
        pumping.startTime
      );
    }

    case "end-pumping": {
      const { pumpingId, amountMl, notes } = args as {
        pumpingId: string;
        amountMl?: number;
        notes?: string;
      };

      const pumping = await prisma.pumpingRecord.update({
        where: { id: pumpingId },
        data: {
          endTime: new Date(),
          amountMl,
          notes,
        },
      });

      return buildEndResponse("pumpingId", pumping.id, pumping.startTime, pumping.endTime!, {
        amountMl: pumping.amountMl,
      });
    }

    case "log-pumping": {
      const { childId, startTime, endTime, amountMl, side, notes } = args as {
        childId: string;
        startTime: string;
        endTime?: string;
        amountMl?: number;
        side?: "LEFT" | "RIGHT" | "BOTH";
        notes?: string;
      };

      const pumping = await prisma.pumpingRecord.create({
        data: {
          childId,
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : null,
          amountMl,
          side,
          notes,
        },
      });

      return buildLogResponse("pumpingId", pumping.id, pumping.startTime, pumping.endTime, {
        amountMl: pumping.amountMl,
        side: pumping.side,
      });
    }

    case "get-pumping-summary": {
      const { childId, period = "today" } = args as {
        childId: string;
        period?: "today" | "week" | "month";
      };

      const { start, end } = getDateRange(period);

      const records = await prisma.pumpingRecord.findMany({
        where: {
          childId,
          startTime: { gte: start, lte: end },
        },
        orderBy: { startTime: "desc" },
      });

      const completedRecords = getCompletedRecords(records);
      const totalMinutes = calculateTotalMinutes(completedRecords);
      const totalAmountMl = records.reduce((sum, r) => sum + (r.amountMl ?? 0), 0);

      return {
        period,
        totalSessions: records.length,
        completedSessions: completedRecords.length,
        totalTime: formatDuration(totalMinutes),
        totalMinutes,
        totalAmountMl,
        averageAmountMl: completedRecords.length > 0
          ? Math.round(totalAmountMl / completedRecords.length)
          : 0,
        recentSessions: mapRecentRecords(records, 5, (r) => ({
          amountMl: r.amountMl,
          side: r.side,
        })),
      };
    }

    case "query-pumping-records": {
      const {
        childId,
        startDate,
        endDate,
        limit,
        offset,
        orderBy = "desc",
        includeSummary = false,
        completedOnly = false,
        side,
      } = args as unknown as QueryInput & {
        completedOnly?: boolean;
        side?: "LEFT" | "RIGHT" | "BOTH";
      };

      const { start, end } = parseQueryDates(startDate, endDate);
      const safeLimit = sanitizeLimit(limit);
      const safeOffset = sanitizeOffset(offset);

      const where = {
        childId,
        startTime: { gte: start, lte: end },
        ...(completedOnly ? { endTime: { not: null } } : {}),
        ...(side ? { side } : {}),
      };

      const [total, records] = await Promise.all([
        prisma.pumpingRecord.count({ where }),
        prisma.pumpingRecord.findMany({
          where,
          orderBy: { startTime: orderBy },
          skip: safeOffset,
          take: safeLimit,
        }),
      ]);

      // Build summary if requested
      let summary;
      if (includeSummary) {
        const completedRecords = getCompletedRecords(records);
        const totalMinutes = calculateTotalMinutes(completedRecords);
        const totalAmountMl = records.reduce((sum, r) => sum + (r.amountMl ?? 0), 0);

        const bySide = {
          left: records.filter((r) => r.side === "LEFT").length,
          right: records.filter((r) => r.side === "RIGHT").length,
          both: records.filter((r) => r.side === "BOTH").length,
          unspecified: records.filter((r) => r.side === null).length,
        };

        summary = {
          totalSessions: records.length,
          completedSessions: completedRecords.length,
          totalTime: formatDuration(totalMinutes),
          totalMinutes,
          totalAmountMl,
          averageAmountMl: completedRecords.length > 0
            ? Math.round(totalAmountMl / completedRecords.length)
            : 0,
          bySide,
        };
      }

      // Map records to output format
      const mappedRecords = records.map((r) => ({
        id: r.id,
        childId: r.childId,
        startTime: r.startTime.toISOString(),
        endTime: r.endTime?.toISOString() ?? null,
        durationMinutes: r.endTime
          ? Math.round((r.endTime.getTime() - r.startTime.getTime()) / 60000)
          : null,
        amountMl: r.amountMl,
        side: r.side,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));

      return buildQueryResponse(mappedRecords, total, safeLimit, safeOffset, start, end, summary);
    }

    default:
      throw new Error(`Unknown pumping tool: ${name}`);
  }
}
