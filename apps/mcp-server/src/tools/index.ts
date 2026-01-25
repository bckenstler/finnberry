import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { PrismaClient } from "@finnberry/db";
import { handleSleepTools } from "./sleep.js";
import { handleFeedingTools } from "./feeding.js";
import { handleDiaperTools } from "./diaper.js";
import { handleChildTools } from "./child.js";
import { handleSummaryTools } from "./summary.js";

export function registerTools(): Tool[] {
  return [
    // Sleep tools
    {
      name: "start-sleep",
      description: "Start a sleep timer for a child. Returns the sleep record ID.",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          sleepType: {
            type: "string",
            enum: ["NAP", "NIGHT"],
            description: "Type of sleep (NAP or NIGHT)",
            default: "NAP",
          },
        },
        required: ["childId"],
      },
    },
    {
      name: "end-sleep",
      description: "End an active sleep session",
      inputSchema: {
        type: "object",
        properties: {
          sleepId: {
            type: "string",
            description: "The ID of the sleep record to end",
          },
          quality: {
            type: "number",
            minimum: 1,
            maximum: 5,
            description: "Sleep quality rating (1-5)",
          },
          notes: {
            type: "string",
            description: "Optional notes about the sleep",
          },
        },
        required: ["sleepId"],
      },
    },
    {
      name: "log-sleep",
      description: "Log a completed sleep with start and end times",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          startTime: {
            type: "string",
            format: "date-time",
            description: "Sleep start time (ISO 8601)",
          },
          endTime: {
            type: "string",
            format: "date-time",
            description: "Sleep end time (ISO 8601)",
          },
          sleepType: {
            type: "string",
            enum: ["NAP", "NIGHT"],
            default: "NAP",
          },
          quality: {
            type: "number",
            minimum: 1,
            maximum: 5,
          },
        },
        required: ["childId", "startTime", "endTime"],
      },
    },
    {
      name: "get-sleep-summary",
      description: "Get sleep statistics for a time period",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          period: {
            type: "string",
            enum: ["today", "week", "month"],
            default: "today",
          },
        },
        required: ["childId"],
      },
    },

    // Feeding tools
    {
      name: "log-breastfeeding",
      description: "Log a breastfeeding session",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          side: {
            type: "string",
            enum: ["LEFT", "RIGHT", "BOTH"],
            description: "Which breast was used",
          },
          startTime: {
            type: "string",
            format: "date-time",
          },
          endTime: {
            type: "string",
            format: "date-time",
          },
          notes: {
            type: "string",
          },
        },
        required: ["childId", "side", "startTime"],
      },
    },
    {
      name: "log-bottle",
      description: "Log a bottle feeding",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          amountMl: {
            type: "number",
            description: "Amount in milliliters",
          },
          time: {
            type: "string",
            format: "date-time",
            description: "Time of feeding (defaults to now)",
          },
          notes: {
            type: "string",
          },
        },
        required: ["childId", "amountMl"],
      },
    },
    {
      name: "log-solids",
      description: "Log solid food feeding",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
          },
          foodItems: {
            type: "array",
            items: { type: "string" },
            description: "List of foods eaten",
          },
          time: {
            type: "string",
            format: "date-time",
          },
          notes: {
            type: "string",
          },
        },
        required: ["childId", "foodItems"],
      },
    },
    {
      name: "get-feeding-summary",
      description: "Get feeding statistics for a time period",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
          },
          period: {
            type: "string",
            enum: ["today", "week", "month"],
            default: "today",
          },
        },
        required: ["childId"],
      },
    },

    // Diaper tools
    {
      name: "log-diaper",
      description: "Log a diaper change",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
          },
          type: {
            type: "string",
            enum: ["WET", "DIRTY", "BOTH", "DRY"],
            description: "Type of diaper",
          },
          time: {
            type: "string",
            format: "date-time",
          },
          color: {
            type: "string",
            enum: ["YELLOW", "GREEN", "BROWN", "BLACK", "RED", "WHITE", "OTHER"],
          },
          consistency: {
            type: "string",
            enum: ["WATERY", "LOOSE", "SOFT", "FORMED", "HARD"],
          },
          notes: {
            type: "string",
          },
        },
        required: ["childId", "type"],
      },
    },
    {
      name: "get-diaper-summary",
      description: "Get diaper statistics for a time period",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
          },
          period: {
            type: "string",
            enum: ["today", "week", "month"],
            default: "today",
          },
        },
        required: ["childId"],
      },
    },

    // Child tools
    {
      name: "list-children",
      description: "List all children the user has access to",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },

    // Summary tools
    {
      name: "get-daily-summary",
      description: "Get a complete summary of all activity for a day",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
          },
          date: {
            type: "string",
            format: "date",
            description: "Date to get summary for (defaults to today)",
          },
        },
        required: ["childId"],
      },
    },
  ];
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  prisma: PrismaClient
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    let result: unknown;

    // Sleep tools
    if (name.includes("sleep")) {
      result = await handleSleepTools(name, args, prisma);
    }
    // Feeding tools
    else if (name.includes("feeding") || name.includes("bottle") || name.includes("solids") || name.includes("breastfeeding")) {
      result = await handleFeedingTools(name, args, prisma);
    }
    // Diaper tools
    else if (name.includes("diaper")) {
      result = await handleDiaperTools(name, args, prisma);
    }
    // Child tools
    else if (name === "list-children") {
      result = await handleChildTools(name, args, prisma);
    }
    // Summary tools
    else if (name === "get-daily-summary") {
      result = await handleSummaryTools(name, args, prisma);
    }
    else {
      throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}
