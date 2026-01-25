import type { Prompt, GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import type { PrismaClient } from "@finnberry/db";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { calculateDurationMinutes, formatDuration } from "@finnberry/utils";

export function registerPrompts(): Prompt[] {
  return [
    {
      name: "analyze-sleep-patterns",
      description: "Get AI insights on a child's sleep patterns over the past week",
      arguments: [
        {
          name: "childId",
          description: "The ID of the child to analyze",
          required: true,
        },
      ],
    },
    {
      name: "daily-summary",
      description: "Generate a parent-friendly daily summary",
      arguments: [
        {
          name: "childId",
          description: "The ID of the child",
          required: true,
        },
        {
          name: "date",
          description: "The date to summarize (YYYY-MM-DD), defaults to today",
          required: false,
        },
      ],
    },
  ];
}

export async function handlePromptGet(
  name: string,
  args: Record<string, string>,
  prisma: PrismaClient
): Promise<GetPromptResult> {
  switch (name) {
    case "analyze-sleep-patterns": {
      const { childId } = args;

      const child = await prisma.child.findUnique({
        where: { id: childId },
        select: { name: true, birthDate: true },
      });

      if (!child) {
        throw new Error("Child not found");
      }

      const weekAgo = subDays(new Date(), 7);
      const records = await prisma.sleepRecord.findMany({
        where: {
          childId,
          startTime: { gte: weekAgo },
          endTime: { not: null },
        },
        orderBy: { startTime: "asc" },
      });

      const dailyData = records.reduce(
        (acc, record) => {
          const date = record.startTime.toISOString().split("T")[0]!;
          if (!acc[date]) {
            acc[date] = { naps: [], nightSleep: [] };
          }

          const duration = calculateDurationMinutes(record.startTime, record.endTime!);
          const entry = {
            start: record.startTime.toLocaleTimeString(),
            duration: formatDuration(duration),
            durationMinutes: duration,
            quality: record.quality,
          };

          if (record.sleepType === "NAP") {
            acc[date].naps.push(entry);
          } else {
            acc[date].nightSleep.push(entry);
          }

          return acc;
        },
        {} as Record<string, { naps: any[]; nightSleep: any[] }>
      );

      const sleepData = JSON.stringify(dailyData, null, 2);

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please analyze the sleep patterns for ${child.name} (born ${child.birthDate.toISOString().split("T")[0]}) over the past week and provide insights.

Here is the sleep data organized by day:

${sleepData}

Please provide:
1. A summary of overall sleep patterns
2. Average total sleep per day (naps + night sleep)
3. Any concerning patterns or areas for improvement
4. Recommendations based on age-appropriate sleep guidelines
5. Positive observations

Keep your response parent-friendly and actionable.`,
            },
          },
        ],
      };
    }

    case "daily-summary": {
      const { childId, date } = args;

      const targetDate = date ? new Date(date) : new Date();
      const start = startOfDay(targetDate);
      const end = endOfDay(targetDate);

      const [child, sleepRecords, feedingRecords, diaperRecords] = await Promise.all([
        prisma.child.findUnique({
          where: { id: childId },
          select: { name: true, birthDate: true },
        }),
        prisma.sleepRecord.findMany({
          where: { childId, startTime: { gte: start, lte: end } },
          orderBy: { startTime: "asc" },
        }),
        prisma.feedingRecord.findMany({
          where: { childId, startTime: { gte: start, lte: end } },
          orderBy: { startTime: "asc" },
        }),
        prisma.diaperRecord.findMany({
          where: { childId, time: { gte: start, lte: end } },
          orderBy: { time: "asc" },
        }),
      ]);

      if (!child) {
        throw new Error("Child not found");
      }

      const totalSleepMinutes = sleepRecords
        .filter((r) => r.endTime)
        .reduce((sum, r) => sum + calculateDurationMinutes(r.startTime, r.endTime!), 0);

      const breastCount = feedingRecords.filter((r) => r.feedingType === "BREAST").length;
      const bottleCount = feedingRecords.filter((r) => r.feedingType === "BOTTLE").length;
      const totalBottleMl = feedingRecords
        .filter((r) => r.feedingType === "BOTTLE")
        .reduce((sum, r) => sum + (r.amountMl ?? 0), 0);
      const solidsCount = feedingRecords.filter((r) => r.feedingType === "SOLIDS").length;

      const wetCount = diaperRecords.filter(
        (r) => r.diaperType === "WET" || r.diaperType === "BOTH"
      ).length;
      const dirtyCount = diaperRecords.filter(
        (r) => r.diaperType === "DIRTY" || r.diaperType === "BOTH"
      ).length;

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please create a friendly, conversational daily summary for ${child.name}'s day on ${targetDate.toLocaleDateString()}.

Here are the stats:

**Sleep:**
- Total sleep: ${formatDuration(totalSleepMinutes)}
- Number of naps: ${sleepRecords.filter((r) => r.sleepType === "NAP").length}
- Night sleep sessions: ${sleepRecords.filter((r) => r.sleepType === "NIGHT").length}

**Feeding:**
- Breastfeeding sessions: ${breastCount}
- Bottle feedings: ${bottleCount} (${totalBottleMl}ml total)
- Solid food meals: ${solidsCount}

**Diapers:**
- Wet: ${wetCount}
- Dirty: ${dirtyCount}
- Total changes: ${diaperRecords.length}

Please create a warm, parent-friendly summary that:
1. Highlights the day's activities in a positive tone
2. Notes anything that seems particularly good or might need attention
3. Keeps it brief but informative (2-3 short paragraphs)`,
            },
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}
