import type { Resource } from "@modelcontextprotocol/sdk/types.js";
import type { PrismaClient } from "@finnberry/db";
import { differenceInMonths, differenceInDays, startOfDay, endOfDay } from "date-fns";
import { calculateDurationMinutes, formatDuration } from "@finnberry/utils";

export async function registerResources(prisma: PrismaClient): Promise<Resource[]> {
  const children = await prisma.child.findMany({
    select: { id: true, name: true },
  });

  const resources: Resource[] = [
    {
      uri: "finnberry://children",
      name: "All Children",
      description: "List of all children you have access to",
      mimeType: "application/json",
    },
  ];

  for (const child of children) {
    resources.push(
      {
        uri: `finnberry://children/${child.id}`,
        name: `${child.name} - Profile`,
        description: `Profile details for ${child.name}`,
        mimeType: "application/json",
      },
      {
        uri: `finnberry://children/${child.id}/today`,
        name: `${child.name} - Today's Activity`,
        description: `Today's sleep, feeding, and diaper records for ${child.name}`,
        mimeType: "application/json",
      },
      {
        uri: `finnberry://children/${child.id}/sleep?period=week`,
        name: `${child.name} - Sleep (Week)`,
        description: `Sleep records for the past week for ${child.name}`,
        mimeType: "application/json",
      },
      {
        uri: `finnberry://children/${child.id}/feeding?period=week`,
        name: `${child.name} - Feeding (Week)`,
        description: `Feeding records for the past week for ${child.name}`,
        mimeType: "application/json",
      }
    );
  }

  return resources;
}

export async function handleResourceRead(
  uri: string,
  prisma: PrismaClient
): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
  const url = new URL(uri);
  const pathParts = url.pathname.split("/").filter(Boolean);

  // finnberry://children
  if (pathParts.length === 1 && pathParts[0] === "children") {
    const children = await prisma.child.findMany({
      include: {
        household: { select: { name: true } },
      },
    });

    const result = children.map((child) => {
      const now = new Date();
      const months = differenceInMonths(now, child.birthDate);
      const days = differenceInDays(now, child.birthDate) % 30;

      return {
        id: child.id,
        name: child.name,
        birthDate: child.birthDate.toISOString().split("T")[0],
        age: months > 0 ? `${months} months, ${days} days` : `${days} days`,
        gender: child.gender,
        household: child.household.name,
      };
    });

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({ children: result }, null, 2),
        },
      ],
    };
  }

  // finnberry://children/{id}
  if (pathParts.length === 2 && pathParts[0] === "children") {
    const childId = pathParts[1];
    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: {
        household: { select: { name: true } },
      },
    });

    if (!child) {
      throw new Error("Child not found");
    }

    const now = new Date();
    const months = differenceInMonths(now, child.birthDate);
    const days = differenceInDays(now, child.birthDate) % 30;

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              id: child.id,
              name: child.name,
              birthDate: child.birthDate.toISOString().split("T")[0],
              age: months > 0 ? `${months} months, ${days} days` : `${days} days`,
              gender: child.gender,
              household: child.household.name,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // finnberry://children/{id}/today
  if (pathParts.length === 3 && pathParts[0] === "children" && pathParts[2] === "today") {
    const childId = pathParts[1];
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());

    const [child, sleepRecords, feedingRecords, diaperRecords] = await Promise.all([
      prisma.child.findUnique({ where: { id: childId }, select: { name: true } }),
      prisma.sleepRecord.findMany({
        where: { childId, startTime: { gte: start, lte: end } },
        orderBy: { startTime: "desc" },
      }),
      prisma.feedingRecord.findMany({
        where: { childId, startTime: { gte: start, lte: end } },
        orderBy: { startTime: "desc" },
      }),
      prisma.diaperRecord.findMany({
        where: { childId, time: { gte: start, lte: end } },
        orderBy: { time: "desc" },
      }),
    ]);

    if (!child) {
      throw new Error("Child not found");
    }

    const totalSleepMinutes = sleepRecords.reduce((sum, r) => {
      if (!r.endTime) return sum;
      return sum + calculateDurationMinutes(r.startTime, r.endTime);
    }, 0);

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              childName: child.name,
              date: new Date().toISOString().split("T")[0],
              summary: {
                totalSleep: formatDuration(totalSleepMinutes),
                sleepSessions: sleepRecords.length,
                feedings: feedingRecords.length,
                diaperChanges: diaperRecords.length,
              },
              sleep: sleepRecords.map((r) => ({
                id: r.id,
                type: r.sleepType,
                start: r.startTime.toISOString(),
                end: r.endTime?.toISOString(),
                quality: r.quality,
              })),
              feeding: feedingRecords.map((r) => ({
                id: r.id,
                type: r.feedingType,
                time: r.startTime.toISOString(),
                side: r.side,
                amountMl: r.amountMl,
                foodItems: r.foodItems,
              })),
              diapers: diaperRecords.map((r) => ({
                id: r.id,
                type: r.diaperType,
                time: r.time.toISOString(),
                color: r.color,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // finnberry://children/{id}/sleep?period=week
  if (pathParts.length === 3 && pathParts[0] === "children" && pathParts[2] === "sleep") {
    const childId = pathParts[1];
    const period = url.searchParams.get("period") || "week";

    const now = new Date();
    const start = period === "week"
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : period === "month"
        ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        : startOfDay(now);

    const records = await prisma.sleepRecord.findMany({
      where: { childId, startTime: { gte: start } },
      orderBy: { startTime: "desc" },
    });

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              period,
              records: records.map((r) => ({
                id: r.id,
                type: r.sleepType,
                start: r.startTime.toISOString(),
                end: r.endTime?.toISOString(),
                duration: r.endTime
                  ? formatDuration(calculateDurationMinutes(r.startTime, r.endTime))
                  : "ongoing",
                quality: r.quality,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // finnberry://children/{id}/feeding?period=week
  if (pathParts.length === 3 && pathParts[0] === "children" && pathParts[2] === "feeding") {
    const childId = pathParts[1];
    const period = url.searchParams.get("period") || "week";

    const now = new Date();
    const start = period === "week"
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : period === "month"
        ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        : startOfDay(now);

    const records = await prisma.feedingRecord.findMany({
      where: { childId, startTime: { gte: start } },
      orderBy: { startTime: "desc" },
    });

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              period,
              records: records.map((r) => ({
                id: r.id,
                type: r.feedingType,
                time: r.startTime.toISOString(),
                side: r.side,
                amountMl: r.amountMl,
                foodItems: r.foodItems,
                duration: r.endTime
                  ? formatDuration(calculateDurationMinutes(r.startTime, r.endTime))
                  : null,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
}
