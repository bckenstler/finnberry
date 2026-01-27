import type { PrismaClient } from "@finnberry/db";
import { getDateRange, calculateDurationMinutes, formatDuration } from "@finnberry/utils";

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

      return {
        success: true,
        pumpingId: pumping.id,
        message: "Started pumping timer",
        startTime: pumping.startTime.toISOString(),
      };
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

      const duration = calculateDurationMinutes(pumping.startTime, pumping.endTime!);

      return {
        success: true,
        pumpingId: pumping.id,
        duration: formatDuration(duration),
        durationMinutes: duration,
        amountMl: pumping.amountMl,
      };
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

      const duration = pumping.endTime
        ? calculateDurationMinutes(pumping.startTime, pumping.endTime)
        : null;

      return {
        success: true,
        pumpingId: pumping.id,
        duration: duration ? formatDuration(duration) : null,
        amountMl: pumping.amountMl,
        side: pumping.side,
      };
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

      const completedRecords = records.filter((r) => r.endTime !== null);

      const totalMinutes = completedRecords.reduce((sum, r) => {
        if (!r.endTime) return sum;
        return sum + calculateDurationMinutes(r.startTime, r.endTime);
      }, 0);

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
        recentSessions: records.slice(0, 5).map((r) => ({
          id: r.id,
          startTime: r.startTime.toISOString(),
          endTime: r.endTime?.toISOString(),
          duration: r.endTime
            ? formatDuration(calculateDurationMinutes(r.startTime, r.endTime))
            : "ongoing",
          amountMl: r.amountMl,
          side: r.side,
        })),
      };
    }

    default:
      throw new Error(`Unknown pumping tool: ${name}`);
  }
}
