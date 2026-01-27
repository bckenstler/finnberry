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

    default:
      throw new Error(`Unknown pumping tool: ${name}`);
  }
}
