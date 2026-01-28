import type { PrismaClient } from "@finnberry/db";
import { getDateRange, calculateDurationMinutes, formatDuration } from "@finnberry/utils";
import {
  parseQueryDates,
  sanitizeLimit,
  sanitizeOffset,
  buildQueryResponse,
  type QueryInput,
} from "./query-helpers.js";

export async function handleFeedingTools(
  name: string,
  args: Record<string, unknown>,
  prisma: PrismaClient
): Promise<unknown> {
  switch (name) {
    case "log-breastfeeding": {
      const { childId, side, startTime, endTime, notes } = args as {
        childId: string;
        side: "LEFT" | "RIGHT" | "BOTH";
        startTime: string;
        endTime?: string;
        notes?: string;
      };

      const feeding = await prisma.feedingRecord.create({
        data: {
          childId,
          feedingType: "BREAST",
          side,
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : undefined,
          notes,
        },
      });

      const duration = feeding.endTime
        ? calculateDurationMinutes(feeding.startTime, feeding.endTime)
        : null;

      return {
        success: true,
        feedingId: feeding.id,
        type: "breastfeeding",
        side,
        duration: duration ? formatDuration(duration) : null,
      };
    }

    case "log-bottle": {
      const { childId, amountMl, time, notes } = args as {
        childId: string;
        amountMl: number;
        time?: string;
        notes?: string;
      };

      const feeding = await prisma.feedingRecord.create({
        data: {
          childId,
          feedingType: "BOTTLE",
          startTime: time ? new Date(time) : new Date(),
          amountMl,
          notes,
        },
      });

      return {
        success: true,
        feedingId: feeding.id,
        type: "bottle",
        amountMl,
        time: feeding.startTime.toISOString(),
      };
    }

    case "log-solids": {
      const { childId, foodItems, time, notes } = args as {
        childId: string;
        foodItems: string[];
        time?: string;
        notes?: string;
      };

      const feeding = await prisma.feedingRecord.create({
        data: {
          childId,
          feedingType: "SOLIDS",
          startTime: time ? new Date(time) : new Date(),
          foodItems,
          notes,
        },
      });

      return {
        success: true,
        feedingId: feeding.id,
        type: "solids",
        foodItems,
        time: feeding.startTime.toISOString(),
      };
    }

    case "get-feeding-summary": {
      const { childId, period = "today" } = args as {
        childId: string;
        period?: "today" | "week" | "month";
      };

      const { start, end } = getDateRange(period);

      const records = await prisma.feedingRecord.findMany({
        where: {
          childId,
          startTime: { gte: start, lte: end },
        },
        orderBy: { startTime: "desc" },
      });

      const breastRecords = records.filter((r) => r.feedingType === "BREAST");
      const bottleRecords = records.filter((r) => r.feedingType === "BOTTLE");
      const solidsRecords = records.filter((r) => r.feedingType === "SOLIDS");

      const breastMinutes = breastRecords.reduce((sum, r) => {
        if (!r.endTime) return sum;
        return sum + calculateDurationMinutes(r.startTime, r.endTime);
      }, 0);

      const totalBottleMl = bottleRecords.reduce(
        (sum, r) => sum + (r.amountMl ?? 0),
        0
      );

      return {
        period,
        totalFeedings: records.length,
        breastfeeding: {
          count: breastRecords.length,
          totalTime: formatDuration(breastMinutes),
          totalMinutes: breastMinutes,
          bySide: {
            left: breastRecords.filter((r) => r.side === "LEFT").length,
            right: breastRecords.filter((r) => r.side === "RIGHT").length,
            both: breastRecords.filter((r) => r.side === "BOTH").length,
          },
        },
        bottle: {
          count: bottleRecords.length,
          totalMl: totalBottleMl,
          averageMl: bottleRecords.length > 0 ? Math.round(totalBottleMl / bottleRecords.length) : 0,
        },
        solids: {
          count: solidsRecords.length,
          foods: [...new Set(solidsRecords.flatMap((r) => r.foodItems))],
        },
        recentFeedings: records.slice(0, 5).map((r) => ({
          id: r.id,
          type: r.feedingType,
          time: r.startTime.toISOString(),
          details:
            r.feedingType === "BREAST"
              ? r.side
              : r.feedingType === "BOTTLE"
                ? `${r.amountMl}ml`
                : r.foodItems.join(", "),
        })),
      };
    }

    case "query-feeding-records": {
      const {
        childId,
        startDate,
        endDate,
        limit,
        offset,
        orderBy = "desc",
        includeSummary = false,
        feedingType,
        side,
      } = args as unknown as QueryInput & {
        feedingType?: "BREAST" | "BOTTLE" | "SOLIDS";
        side?: "LEFT" | "RIGHT" | "BOTH";
      };

      const { start, end } = parseQueryDates(startDate, endDate);
      const safeLimit = sanitizeLimit(limit);
      const safeOffset = sanitizeOffset(offset);

      const where = {
        childId,
        startTime: { gte: start, lte: end },
        ...(feedingType ? { feedingType } : {}),
        ...(side ? { side } : {}),
      };

      const [total, records] = await Promise.all([
        prisma.feedingRecord.count({ where }),
        prisma.feedingRecord.findMany({
          where,
          orderBy: { startTime: orderBy },
          skip: safeOffset,
          take: safeLimit,
        }),
      ]);

      // Build summary if requested
      let summary;
      if (includeSummary) {
        const breastRecords = records.filter((r) => r.feedingType === "BREAST");
        const bottleRecords = records.filter((r) => r.feedingType === "BOTTLE");
        const solidsRecords = records.filter((r) => r.feedingType === "SOLIDS");

        const breastMinutes = breastRecords.reduce((sum, r) => {
          if (!r.endTime) return sum;
          return sum + calculateDurationMinutes(r.startTime, r.endTime);
        }, 0);

        const totalBottleMl = bottleRecords.reduce(
          (sum, r) => sum + (r.amountMl ?? 0),
          0
        );

        summary = {
          totalFeedings: records.length,
          breastfeeding: {
            count: breastRecords.length,
            totalTime: formatDuration(breastMinutes),
            totalMinutes: breastMinutes,
            bySide: {
              left: breastRecords.filter((r) => r.side === "LEFT").length,
              right: breastRecords.filter((r) => r.side === "RIGHT").length,
              both: breastRecords.filter((r) => r.side === "BOTH").length,
            },
          },
          bottle: {
            count: bottleRecords.length,
            totalMl: totalBottleMl,
            averageMl: bottleRecords.length > 0 ? Math.round(totalBottleMl / bottleRecords.length) : 0,
          },
          solids: {
            count: solidsRecords.length,
            foods: [...new Set(solidsRecords.flatMap((r) => r.foodItems))],
          },
        };
      }

      // Map records to output format
      const mappedRecords = records.map((r) => ({
        id: r.id,
        childId: r.childId,
        feedingType: r.feedingType,
        startTime: r.startTime.toISOString(),
        endTime: r.endTime?.toISOString() ?? null,
        durationMinutes: r.endTime
          ? Math.round((r.endTime.getTime() - r.startTime.getTime()) / 60000)
          : null,
        side: r.side,
        amountMl: r.amountMl,
        foodItems: r.foodItems,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));

      return buildQueryResponse(mappedRecords, total, safeLimit, safeOffset, start, end, summary);
    }

    default:
      throw new Error(`Unknown feeding tool: ${name}`);
  }
}
