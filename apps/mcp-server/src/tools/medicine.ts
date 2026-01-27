import type { PrismaClient } from "@finnberry/db";
import { getDateRange, formatTime } from "@finnberry/utils";

export async function handleMedicineTools(
  name: string,
  args: Record<string, unknown>,
  prisma: PrismaClient
): Promise<unknown> {
  switch (name) {
    case "create-medicine": {
      const { childId, medicineName, dosage, frequency, notes } = args as {
        childId: string;
        medicineName: string;
        dosage: string;
        frequency?: string;
        notes?: string;
      };

      const medicine = await prisma.medicine.create({
        data: {
          childId,
          name: medicineName,
          dosage,
          frequency,
          notes,
          isActive: true,
        },
      });

      return {
        success: true,
        medicineId: medicine.id,
        name: medicine.name,
        dosage: medicine.dosage,
        frequency: medicine.frequency,
        message: `Created medicine "${medicine.name}"`,
      };
    }

    case "list-medicines": {
      const { childId, activeOnly = true } = args as {
        childId: string;
        activeOnly?: boolean;
      };

      const medicines = await prisma.medicine.findMany({
        where: {
          childId,
          ...(activeOnly ? { isActive: true } : {}),
        },
        include: {
          _count: {
            select: { records: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        medicines: medicines.map((m) => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          isActive: m.isActive,
          totalDoses: m._count.records,
        })),
        total: medicines.length,
      };
    }

    case "log-medicine": {
      const { medicineId, time, dosageGiven, skipped = false, notes } = args as {
        medicineId: string;
        time?: string;
        dosageGiven?: string;
        skipped?: boolean;
        notes?: string;
      };

      const medicine = await prisma.medicine.findUnique({
        where: { id: medicineId },
      });

      if (!medicine) {
        throw new Error("Medicine not found");
      }

      const record = await prisma.medicineRecord.create({
        data: {
          medicineId,
          time: time ? new Date(time) : new Date(),
          dosageGiven: dosageGiven ?? medicine.dosage,
          skipped,
          notes,
        },
      });

      return {
        success: true,
        recordId: record.id,
        medicineName: medicine.name,
        time: record.time.toISOString(),
        dosageGiven: record.dosageGiven,
        skipped: record.skipped,
        message: skipped
          ? `Skipped dose of ${medicine.name}`
          : `Logged ${record.dosageGiven} of ${medicine.name}`,
      };
    }

    case "get-medicine-records": {
      const { medicineId, period = "week" } = args as {
        medicineId: string;
        period?: "today" | "week" | "month";
      };

      const medicine = await prisma.medicine.findUnique({
        where: { id: medicineId },
      });

      if (!medicine) {
        throw new Error("Medicine not found");
      }

      const { start, end } = getDateRange(period);

      const records = await prisma.medicineRecord.findMany({
        where: {
          medicineId,
          time: { gte: start, lte: end },
        },
        orderBy: { time: "desc" },
      });

      const givenCount = records.filter((r) => !r.skipped).length;
      const skippedCount = records.filter((r) => r.skipped).length;

      return {
        medicine: {
          id: medicine.id,
          name: medicine.name,
          dosage: medicine.dosage,
          frequency: medicine.frequency,
        },
        period,
        totalRecords: records.length,
        givenCount,
        skippedCount,
        records: records.slice(0, 10).map((r) => ({
          id: r.id,
          time: r.time.toISOString(),
          formattedTime: formatTime(r.time),
          dosageGiven: r.dosageGiven,
          skipped: r.skipped,
          notes: r.notes,
        })),
      };
    }

    default:
      throw new Error(`Unknown medicine tool: ${name}`);
  }
}
