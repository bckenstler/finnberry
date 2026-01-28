import type { PrismaClient } from "@finnberry/db";
import { getDateRange, calculateDurationMinutes, formatDuration } from "@finnberry/utils";
import {
  buildStartResponse,
  buildEndResponse,
  buildLogResponse,
  mapRecentRecords,
} from "./helpers.js";
import {
  parseQueryDates,
  sanitizeLimit,
  sanitizeOffset,
  buildQueryResponse,
  type QueryInput,
} from "./query-helpers.js";

type ActivityType =
  | "TUMMY_TIME"
  | "BATH"
  | "OUTDOOR_PLAY"
  | "INDOOR_PLAY"
  | "SCREEN_TIME"
  | "SKIN_TO_SKIN"
  | "STORYTIME"
  | "TEETH_BRUSHING"
  | "OTHER";

const ACTIVITY_LABELS: Record<ActivityType, string> = {
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

export async function handleActivityTools(
  name: string,
  args: Record<string, unknown>,
  prisma: PrismaClient
): Promise<unknown> {
  switch (name) {
    case "start-activity": {
      const { childId, activityType } = args as {
        childId: string;
        activityType: ActivityType;
      };

      const existingActive = await prisma.activityRecord.findFirst({
        where: {
          childId,
          activityType,
          endTime: null,
        },
      });

      if (existingActive) {
        throw new Error(`There is already an active ${ACTIVITY_LABELS[activityType]} session for this child`);
      }

      const activity = await prisma.activityRecord.create({
        data: {
          childId,
          activityType,
          startTime: new Date(),
        },
      });

      return buildStartResponse(
        "activityId",
        activity.id,
        `Started ${ACTIVITY_LABELS[activityType]} timer`,
        activity.startTime,
        {
          activityType: activity.activityType,
          activityLabel: ACTIVITY_LABELS[activity.activityType as ActivityType],
        }
      );
    }

    case "end-activity": {
      const { activityId, notes } = args as {
        activityId: string;
        notes?: string;
      };

      const activity = await prisma.activityRecord.update({
        where: { id: activityId },
        data: {
          endTime: new Date(),
          notes,
        },
      });

      return buildEndResponse("activityId", activity.id, activity.startTime, activity.endTime!, {
        activityType: activity.activityType,
        activityLabel: ACTIVITY_LABELS[activity.activityType as ActivityType],
      });
    }

    case "log-activity": {
      const { childId, activityType, startTime, endTime, notes } = args as {
        childId: string;
        activityType: ActivityType;
        startTime: string;
        endTime?: string;
        notes?: string;
      };

      const activity = await prisma.activityRecord.create({
        data: {
          childId,
          activityType,
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : null,
          notes,
        },
      });

      return buildLogResponse("activityId", activity.id, activity.startTime, activity.endTime, {
        activityType: activity.activityType,
        activityLabel: ACTIVITY_LABELS[activity.activityType as ActivityType],
      });
    }

    case "get-activity-summary": {
      const { childId, period = "today" } = args as {
        childId: string;
        period?: "today" | "week" | "month";
      };

      const { start, end } = getDateRange(period);

      const records = await prisma.activityRecord.findMany({
        where: {
          childId,
          startTime: { gte: start, lte: end },
        },
        orderBy: { startTime: "desc" },
      });

      // Group by activity type
      const byType: Record<string, { count: number; totalMinutes: number }> = {};

      records.forEach((r) => {
        const type = r.activityType;
        if (!byType[type]) {
          byType[type] = { count: 0, totalMinutes: 0 };
        }
        byType[type].count++;
        if (r.endTime) {
          byType[type].totalMinutes += calculateDurationMinutes(r.startTime, r.endTime);
        }
      });

      const totalMinutes = Object.values(byType).reduce((sum, t) => sum + t.totalMinutes, 0);

      return {
        period,
        totalActivities: records.length,
        totalTime: formatDuration(totalMinutes),
        totalMinutes,
        byType: Object.entries(byType).map(([type, data]) => ({
          activityType: type,
          activityLabel: ACTIVITY_LABELS[type as ActivityType],
          count: data.count,
          totalTime: formatDuration(data.totalMinutes),
          totalMinutes: data.totalMinutes,
        })),
        recentActivities: mapRecentRecords(records, 5, (r) => ({
          activityType: r.activityType,
          activityLabel: ACTIVITY_LABELS[r.activityType as ActivityType],
          notes: r.notes,
        })),
      };
    }

    case "query-activity-records": {
      const {
        childId,
        startDate,
        endDate,
        limit,
        offset,
        orderBy = "desc",
        includeSummary = false,
        activityType,
      } = args as unknown as QueryInput & {
        activityType?: ActivityType;
      };

      const { start, end } = parseQueryDates(startDate, endDate);
      const safeLimit = sanitizeLimit(limit);
      const safeOffset = sanitizeOffset(offset);

      const where = {
        childId,
        startTime: { gte: start, lte: end },
        ...(activityType ? { activityType } : {}),
      };

      const [total, records] = await Promise.all([
        prisma.activityRecord.count({ where }),
        prisma.activityRecord.findMany({
          where,
          orderBy: { startTime: orderBy },
          skip: safeOffset,
          take: safeLimit,
        }),
      ]);

      // Build summary if requested
      let summary;
      if (includeSummary) {
        // Group by activity type
        const byType: Record<string, { count: number; totalMinutes: number }> = {};

        records.forEach((r) => {
          const type = r.activityType;
          if (!byType[type]) {
            byType[type] = { count: 0, totalMinutes: 0 };
          }
          byType[type].count++;
          if (r.endTime) {
            byType[type].totalMinutes += calculateDurationMinutes(r.startTime, r.endTime);
          }
        });

        const totalMinutes = Object.values(byType).reduce((sum, t) => sum + t.totalMinutes, 0);
        const completedCount = records.filter((r) => r.endTime !== null).length;

        summary = {
          totalActivities: records.length,
          completedActivities: completedCount,
          totalTime: formatDuration(totalMinutes),
          totalMinutes,
          byType: Object.entries(byType).map(([type, data]) => ({
            activityType: type,
            activityLabel: ACTIVITY_LABELS[type as ActivityType],
            count: data.count,
            totalTime: formatDuration(data.totalMinutes),
            totalMinutes: data.totalMinutes,
          })),
        };
      }

      // Map records to output format
      const mappedRecords = records.map((r) => ({
        id: r.id,
        childId: r.childId,
        activityType: r.activityType,
        activityLabel: ACTIVITY_LABELS[r.activityType as ActivityType],
        startTime: r.startTime.toISOString(),
        endTime: r.endTime?.toISOString() ?? null,
        durationMinutes: r.endTime
          ? Math.round((r.endTime.getTime() - r.startTime.getTime()) / 60000)
          : null,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));

      return buildQueryResponse(mappedRecords, total, safeLimit, safeOffset, start, end, summary);
    }

    default:
      throw new Error(`Unknown activity tool: ${name}`);
  }
}
