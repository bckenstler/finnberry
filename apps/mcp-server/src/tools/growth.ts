import type { PrismaClient } from "@finnberry/db";
import { formatWeight, formatHeight } from "@finnberry/utils";

export async function handleGrowthTools(
  name: string,
  args: Record<string, unknown>,
  prisma: PrismaClient
): Promise<unknown> {
  switch (name) {
    case "log-growth": {
      const { childId, date, weightKg, heightCm, headCircumferenceCm, notes } = args as {
        childId: string;
        date: string;
        weightKg?: number;
        heightCm?: number;
        headCircumferenceCm?: number;
        notes?: string;
      };

      if (!weightKg && !heightCm && !headCircumferenceCm) {
        throw new Error("At least one measurement (weightKg, heightCm, or headCircumferenceCm) is required");
      }

      const growth = await prisma.growthRecord.create({
        data: {
          childId,
          date: new Date(date),
          weightKg,
          heightCm,
          headCircumferenceCm,
          notes,
        },
      });

      return {
        success: true,
        growthId: growth.id,
        date: growth.date.toISOString().split("T")[0],
        measurements: {
          weightKg: growth.weightKg,
          weightFormatted: growth.weightKg ? formatWeight(growth.weightKg) : null,
          heightCm: growth.heightCm,
          heightFormatted: growth.heightCm ? formatHeight(growth.heightCm) : null,
          headCircumferenceCm: growth.headCircumferenceCm,
        },
        message: "Recorded growth measurements",
      };
    }

    case "get-growth-records": {
      const { childId, limit = 10 } = args as {
        childId: string;
        limit?: number;
      };

      const records = await prisma.growthRecord.findMany({
        where: { childId },
        orderBy: { date: "desc" },
        take: limit,
      });

      // Calculate changes from previous record
      const recordsWithChanges = records.map((r, index) => {
        const prevRecord = records[index + 1];
        const weightChange = r.weightKg && prevRecord?.weightKg
          ? r.weightKg - prevRecord.weightKg
          : null;
        const heightChange = r.heightCm && prevRecord?.heightCm
          ? r.heightCm - prevRecord.heightCm
          : null;

        return {
          id: r.id,
          date: r.date.toISOString().split("T")[0],
          weightKg: r.weightKg,
          weightFormatted: r.weightKg ? formatWeight(r.weightKg) : null,
          weightChange: weightChange ? Number(weightChange.toFixed(2)) : null,
          heightCm: r.heightCm,
          heightFormatted: r.heightCm ? formatHeight(r.heightCm) : null,
          heightChange: heightChange ? Number(heightChange.toFixed(1)) : null,
          headCircumferenceCm: r.headCircumferenceCm,
          notes: r.notes,
        };
      });

      return {
        totalRecords: records.length,
        records: recordsWithChanges,
      };
    }

    case "get-latest-growth": {
      const { childId } = args as {
        childId: string;
      };

      const latestRecord = await prisma.growthRecord.findFirst({
        where: { childId },
        orderBy: { date: "desc" },
      });

      if (!latestRecord) {
        return {
          found: false,
          message: "No growth records found for this child",
        };
      }

      // Get previous record for comparison
      const previousRecord = await prisma.growthRecord.findFirst({
        where: {
          childId,
          date: { lt: latestRecord.date },
        },
        orderBy: { date: "desc" },
      });

      const weightChange = latestRecord.weightKg && previousRecord?.weightKg
        ? latestRecord.weightKg - previousRecord.weightKg
        : null;
      const heightChange = latestRecord.heightCm && previousRecord?.heightCm
        ? latestRecord.heightCm - previousRecord.heightCm
        : null;

      return {
        found: true,
        date: latestRecord.date.toISOString().split("T")[0],
        measurements: {
          weightKg: latestRecord.weightKg,
          weightFormatted: latestRecord.weightKg ? formatWeight(latestRecord.weightKg) : null,
          weightChange: weightChange ? Number(weightChange.toFixed(2)) : null,
          heightCm: latestRecord.heightCm,
          heightFormatted: latestRecord.heightCm ? formatHeight(latestRecord.heightCm) : null,
          heightChange: heightChange ? Number(heightChange.toFixed(1)) : null,
          headCircumferenceCm: latestRecord.headCircumferenceCm,
        },
        previousDate: previousRecord?.date.toISOString().split("T")[0] ?? null,
      };
    }

    default:
      throw new Error(`Unknown growth tool: ${name}`);
  }
}
