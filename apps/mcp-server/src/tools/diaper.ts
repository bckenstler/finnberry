import type { PrismaClient } from "@finnberry/db";
import { getDateRange } from "@finnberry/utils";

export async function handleDiaperTools(
  name: string,
  args: Record<string, unknown>,
  prisma: PrismaClient
): Promise<unknown> {
  switch (name) {
    case "log-diaper": {
      const { childId, type, time, color, consistency, notes } = args as {
        childId: string;
        type: "WET" | "DIRTY" | "BOTH" | "DRY";
        time?: string;
        color?: string;
        consistency?: string;
        notes?: string;
      };

      const diaper = await prisma.diaperRecord.create({
        data: {
          childId,
          diaperType: type,
          time: time ? new Date(time) : new Date(),
          color: color as any,
          consistency: consistency as any,
          notes,
        },
      });

      return {
        success: true,
        diaperId: diaper.id,
        type: diaper.diaperType,
        time: diaper.time.toISOString(),
        color: diaper.color,
        consistency: diaper.consistency,
      };
    }

    case "get-diaper-summary": {
      const { childId, period = "today" } = args as {
        childId: string;
        period?: "today" | "week" | "month";
      };

      const { start, end } = getDateRange(period);

      const records = await prisma.diaperRecord.findMany({
        where: {
          childId,
          time: { gte: start, lte: end },
        },
        orderBy: { time: "desc" },
      });

      const wetCount = records.filter(
        (r) => r.diaperType === "WET" || r.diaperType === "BOTH"
      ).length;
      const dirtyCount = records.filter(
        (r) => r.diaperType === "DIRTY" || r.diaperType === "BOTH"
      ).length;
      const dryCount = records.filter((r) => r.diaperType === "DRY").length;

      const colorDistribution = records
        .filter((r) => r.color)
        .reduce(
          (acc, r) => {
            const color = r.color!;
            acc[color] = (acc[color] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

      return {
        period,
        totalChanges: records.length,
        byType: {
          wet: wetCount,
          dirty: dirtyCount,
          dry: dryCount,
        },
        colorDistribution,
        lastChange: records[0]
          ? {
              time: records[0].time.toISOString(),
              type: records[0].diaperType,
              color: records[0].color,
            }
          : null,
        recentChanges: records.slice(0, 5).map((r) => ({
          id: r.id,
          type: r.diaperType,
          time: r.time.toISOString(),
          color: r.color,
          consistency: r.consistency,
        })),
      };
    }

    default:
      throw new Error(`Unknown diaper tool: ${name}`);
  }
}
