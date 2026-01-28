import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { PrismaClient } from "@finnberry/db";
import { handleSleepTools } from "./sleep.js";
import { handleFeedingTools } from "./feeding.js";
import { handleDiaperTools } from "./diaper.js";
import { handleChildTools } from "./child.js";
import { handleSummaryTools } from "./summary.js";
import { handlePumpingTools } from "./pumping.js";
import { handleMedicineTools } from "./medicine.js";
import { handleGrowthTools } from "./growth.js";
import { handleTemperatureTools } from "./temperature.js";
import { handleActivityTools } from "./activity.js";

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

    // Pumping tools
    {
      name: "start-pumping",
      description: "Start a pumping timer for a child. Returns the pumping record ID.",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
        },
        required: ["childId"],
      },
    },
    {
      name: "end-pumping",
      description: "End an active pumping session",
      inputSchema: {
        type: "object",
        properties: {
          pumpingId: {
            type: "string",
            description: "The ID of the pumping record to end",
          },
          amountMl: {
            type: "number",
            description: "Amount pumped in milliliters",
          },
          notes: {
            type: "string",
            description: "Optional notes about the pumping session",
          },
        },
        required: ["pumpingId"],
      },
    },
    {
      name: "log-pumping",
      description: "Log a completed pumping session with start and optional end times",
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
            description: "Pumping start time (ISO 8601)",
          },
          endTime: {
            type: "string",
            format: "date-time",
            description: "Pumping end time (ISO 8601)",
          },
          amountMl: {
            type: "number",
            description: "Amount pumped in milliliters",
          },
          side: {
            type: "string",
            enum: ["LEFT", "RIGHT", "BOTH"],
            description: "Which breast was pumped",
          },
          notes: {
            type: "string",
          },
        },
        required: ["childId", "startTime"],
      },
    },
    {
      name: "get-pumping-summary",
      description: "Get pumping statistics for a time period",
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

    // Medicine tools
    {
      name: "create-medicine",
      description: "Create a medicine definition for a child",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          medicineName: {
            type: "string",
            description: "Name of the medicine",
          },
          dosage: {
            type: "string",
            description: "Default dosage (e.g., '5ml', '1 tablet')",
          },
          frequency: {
            type: "string",
            description: "How often to take (e.g., 'twice daily', 'every 6 hours')",
          },
          notes: {
            type: "string",
            description: "Additional notes about the medicine",
          },
        },
        required: ["childId", "medicineName", "dosage"],
      },
    },
    {
      name: "list-medicines",
      description: "List all medicines for a child",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          activeOnly: {
            type: "boolean",
            description: "Only show active medicines (default: true)",
            default: true,
          },
        },
        required: ["childId"],
      },
    },
    {
      name: "log-medicine",
      description: "Log a medicine dose administration",
      inputSchema: {
        type: "object",
        properties: {
          medicineId: {
            type: "string",
            description: "The ID of the medicine",
          },
          time: {
            type: "string",
            format: "date-time",
            description: "Time of administration (defaults to now)",
          },
          dosageGiven: {
            type: "string",
            description: "Actual dosage given (defaults to medicine's default dosage)",
          },
          skipped: {
            type: "boolean",
            description: "Whether the dose was skipped",
            default: false,
          },
          notes: {
            type: "string",
            description: "Notes about this dose",
          },
        },
        required: ["medicineId"],
      },
    },
    {
      name: "get-medicine-records",
      description: "Get medicine administration history",
      inputSchema: {
        type: "object",
        properties: {
          medicineId: {
            type: "string",
            description: "The ID of the medicine",
          },
          period: {
            type: "string",
            enum: ["today", "week", "month"],
            default: "week",
          },
        },
        required: ["medicineId"],
      },
    },

    // Growth tools
    {
      name: "log-growth",
      description: "Record growth measurements (weight, height, head circumference)",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          date: {
            type: "string",
            format: "date",
            description: "Date of measurement (ISO 8601 date)",
          },
          weightKg: {
            type: "number",
            description: "Weight in kilograms",
          },
          heightCm: {
            type: "number",
            description: "Height/length in centimeters",
          },
          headCircumferenceCm: {
            type: "number",
            description: "Head circumference in centimeters",
          },
          notes: {
            type: "string",
          },
        },
        required: ["childId", "date"],
      },
    },
    {
      name: "get-growth-records",
      description: "Get growth measurement history",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          limit: {
            type: "number",
            description: "Maximum number of records to return (default: 10)",
            default: 10,
          },
        },
        required: ["childId"],
      },
    },
    {
      name: "get-latest-growth",
      description: "Get the most recent growth measurements",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
        },
        required: ["childId"],
      },
    },

    // Temperature tools
    {
      name: "log-temperature",
      description: "Record a temperature reading",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          temperatureCelsius: {
            type: "number",
            description: "Temperature in Celsius",
          },
          time: {
            type: "string",
            format: "date-time",
            description: "Time of reading (defaults to now)",
          },
          notes: {
            type: "string",
          },
        },
        required: ["childId", "temperatureCelsius"],
      },
    },
    {
      name: "get-temperature-records",
      description: "Get temperature reading history",
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
            default: "week",
          },
        },
        required: ["childId"],
      },
    },
    {
      name: "get-latest-temperature",
      description: "Get the most recent temperature reading",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
        },
        required: ["childId"],
      },
    },

    // Activity tools
    {
      name: "start-activity",
      description: "Start an activity timer for a child",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          activityType: {
            type: "string",
            enum: [
              "TUMMY_TIME",
              "BATH",
              "OUTDOOR_PLAY",
              "INDOOR_PLAY",
              "SCREEN_TIME",
              "SKIN_TO_SKIN",
              "STORYTIME",
              "TEETH_BRUSHING",
              "OTHER",
            ],
            description: "Type of activity",
          },
        },
        required: ["childId", "activityType"],
      },
    },
    {
      name: "end-activity",
      description: "End an active activity session",
      inputSchema: {
        type: "object",
        properties: {
          activityId: {
            type: "string",
            description: "The ID of the activity record to end",
          },
          notes: {
            type: "string",
            description: "Optional notes about the activity",
          },
        },
        required: ["activityId"],
      },
    },
    {
      name: "log-activity",
      description: "Log a completed activity with start and optional end times",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          activityType: {
            type: "string",
            enum: [
              "TUMMY_TIME",
              "BATH",
              "OUTDOOR_PLAY",
              "INDOOR_PLAY",
              "SCREEN_TIME",
              "SKIN_TO_SKIN",
              "STORYTIME",
              "TEETH_BRUSHING",
              "OTHER",
            ],
            description: "Type of activity",
          },
          startTime: {
            type: "string",
            format: "date-time",
            description: "Activity start time (ISO 8601)",
          },
          endTime: {
            type: "string",
            format: "date-time",
            description: "Activity end time (ISO 8601)",
          },
          notes: {
            type: "string",
          },
        },
        required: ["childId", "activityType", "startTime"],
      },
    },
    {
      name: "get-activity-summary",
      description: "Get activity statistics for a time period",
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

    // Query tools - Full record access with custom date ranges, pagination, and filtering
    {
      name: "query-sleep-records",
      description: "Query sleep records with custom date range, pagination, and filtering. Returns raw records with optional summary statistics.",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          startDate: {
            type: "string",
            format: "date-time",
            description: "Start of date range (ISO 8601). Defaults to 7 days ago.",
          },
          endDate: {
            type: "string",
            format: "date-time",
            description: "End of date range (ISO 8601). Defaults to now.",
          },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 500,
            default: 100,
            description: "Maximum records to return (1-500, default 100)",
          },
          offset: {
            type: "number",
            minimum: 0,
            default: 0,
            description: "Records to skip for pagination (default 0)",
          },
          orderBy: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
            description: "Sort order by time (default: desc)",
          },
          includeSummary: {
            type: "boolean",
            default: false,
            description: "Include aggregated summary statistics",
          },
          sleepType: {
            type: "string",
            enum: ["NAP", "NIGHT"],
            description: "Filter by sleep type",
          },
          completedOnly: {
            type: "boolean",
            default: false,
            description: "Only return completed sleep sessions (with endTime)",
          },
        },
        required: ["childId"],
      },
    },
    {
      name: "query-feeding-records",
      description: "Query feeding records with custom date range, pagination, and filtering. Returns raw records with optional summary statistics.",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          startDate: {
            type: "string",
            format: "date-time",
            description: "Start of date range (ISO 8601). Defaults to 7 days ago.",
          },
          endDate: {
            type: "string",
            format: "date-time",
            description: "End of date range (ISO 8601). Defaults to now.",
          },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 500,
            default: 100,
            description: "Maximum records to return (1-500, default 100)",
          },
          offset: {
            type: "number",
            minimum: 0,
            default: 0,
            description: "Records to skip for pagination (default 0)",
          },
          orderBy: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
            description: "Sort order by time (default: desc)",
          },
          includeSummary: {
            type: "boolean",
            default: false,
            description: "Include aggregated summary statistics",
          },
          feedingType: {
            type: "string",
            enum: ["BREAST", "BOTTLE", "SOLIDS"],
            description: "Filter by feeding type",
          },
          side: {
            type: "string",
            enum: ["LEFT", "RIGHT", "BOTH"],
            description: "Filter by breast side (for breastfeeding)",
          },
        },
        required: ["childId"],
      },
    },
    {
      name: "query-diaper-records",
      description: "Query diaper records with custom date range, pagination, and filtering. Returns raw records with optional summary statistics.",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          startDate: {
            type: "string",
            format: "date-time",
            description: "Start of date range (ISO 8601). Defaults to 7 days ago.",
          },
          endDate: {
            type: "string",
            format: "date-time",
            description: "End of date range (ISO 8601). Defaults to now.",
          },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 500,
            default: 100,
            description: "Maximum records to return (1-500, default 100)",
          },
          offset: {
            type: "number",
            minimum: 0,
            default: 0,
            description: "Records to skip for pagination (default 0)",
          },
          orderBy: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
            description: "Sort order by time (default: desc)",
          },
          includeSummary: {
            type: "boolean",
            default: false,
            description: "Include aggregated summary statistics",
          },
          diaperType: {
            type: "string",
            enum: ["WET", "DIRTY", "BOTH", "DRY"],
            description: "Filter by diaper type",
          },
          color: {
            type: "string",
            enum: ["YELLOW", "GREEN", "BROWN", "BLACK", "RED", "WHITE", "OTHER"],
            description: "Filter by stool color",
          },
        },
        required: ["childId"],
      },
    },
    {
      name: "query-pumping-records",
      description: "Query pumping records with custom date range, pagination, and filtering. Returns raw records with optional summary statistics.",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          startDate: {
            type: "string",
            format: "date-time",
            description: "Start of date range (ISO 8601). Defaults to 7 days ago.",
          },
          endDate: {
            type: "string",
            format: "date-time",
            description: "End of date range (ISO 8601). Defaults to now.",
          },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 500,
            default: 100,
            description: "Maximum records to return (1-500, default 100)",
          },
          offset: {
            type: "number",
            minimum: 0,
            default: 0,
            description: "Records to skip for pagination (default 0)",
          },
          orderBy: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
            description: "Sort order by time (default: desc)",
          },
          includeSummary: {
            type: "boolean",
            default: false,
            description: "Include aggregated summary statistics",
          },
          completedOnly: {
            type: "boolean",
            default: false,
            description: "Only return completed sessions (with endTime)",
          },
          side: {
            type: "string",
            enum: ["LEFT", "RIGHT", "BOTH"],
            description: "Filter by breast side",
          },
        },
        required: ["childId"],
      },
    },
    {
      name: "query-activity-records",
      description: "Query activity records with custom date range, pagination, and filtering. Returns raw records with optional summary statistics.",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          startDate: {
            type: "string",
            format: "date-time",
            description: "Start of date range (ISO 8601). Defaults to 7 days ago.",
          },
          endDate: {
            type: "string",
            format: "date-time",
            description: "End of date range (ISO 8601). Defaults to now.",
          },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 500,
            default: 100,
            description: "Maximum records to return (1-500, default 100)",
          },
          offset: {
            type: "number",
            minimum: 0,
            default: 0,
            description: "Records to skip for pagination (default 0)",
          },
          orderBy: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
            description: "Sort order by time (default: desc)",
          },
          includeSummary: {
            type: "boolean",
            default: false,
            description: "Include aggregated summary statistics",
          },
          activityType: {
            type: "string",
            enum: [
              "TUMMY_TIME",
              "BATH",
              "OUTDOOR_PLAY",
              "INDOOR_PLAY",
              "SCREEN_TIME",
              "SKIN_TO_SKIN",
              "STORYTIME",
              "TEETH_BRUSHING",
              "OTHER",
            ],
            description: "Filter by activity type",
          },
        },
        required: ["childId"],
      },
    },
    {
      name: "query-temperature-records",
      description: "Query temperature records with custom date range, pagination, and filtering. Returns raw records with optional summary statistics.",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          startDate: {
            type: "string",
            format: "date-time",
            description: "Start of date range (ISO 8601). Defaults to 7 days ago.",
          },
          endDate: {
            type: "string",
            format: "date-time",
            description: "End of date range (ISO 8601). Defaults to now.",
          },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 500,
            default: 100,
            description: "Maximum records to return (1-500, default 100)",
          },
          offset: {
            type: "number",
            minimum: 0,
            default: 0,
            description: "Records to skip for pagination (default 0)",
          },
          orderBy: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
            description: "Sort order by time (default: desc)",
          },
          includeSummary: {
            type: "boolean",
            default: false,
            description: "Include aggregated summary statistics",
          },
          feverOnly: {
            type: "boolean",
            default: false,
            description: "Only return fever readings (>= 38.0°C)",
          },
        },
        required: ["childId"],
      },
    },
    {
      name: "query-medicine-records",
      description: "Query medicine administration records with custom date range, pagination, and filtering. Returns raw records with optional summary statistics.",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          startDate: {
            type: "string",
            format: "date-time",
            description: "Start of date range (ISO 8601). Defaults to 7 days ago.",
          },
          endDate: {
            type: "string",
            format: "date-time",
            description: "End of date range (ISO 8601). Defaults to now.",
          },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 500,
            default: 100,
            description: "Maximum records to return (1-500, default 100)",
          },
          offset: {
            type: "number",
            minimum: 0,
            default: 0,
            description: "Records to skip for pagination (default 0)",
          },
          orderBy: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
            description: "Sort order by time (default: desc)",
          },
          includeSummary: {
            type: "boolean",
            default: false,
            description: "Include aggregated summary statistics",
          },
          medicineId: {
            type: "string",
            description: "Filter by specific medicine ID",
          },
          includeSkipped: {
            type: "boolean",
            default: true,
            description: "Include skipped doses in results",
          },
        },
        required: ["childId"],
      },
    },
    {
      name: "query-growth-records",
      description: "Query growth records with custom date range and pagination. Returns raw records with optional summary statistics.",
      inputSchema: {
        type: "object",
        properties: {
          childId: {
            type: "string",
            description: "The ID of the child",
          },
          startDate: {
            type: "string",
            format: "date-time",
            description: "Start of date range (ISO 8601). Defaults to 7 days ago.",
          },
          endDate: {
            type: "string",
            format: "date-time",
            description: "End of date range (ISO 8601). Defaults to now.",
          },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 500,
            default: 100,
            description: "Maximum records to return (1-500, default 100)",
          },
          offset: {
            type: "number",
            minimum: 0,
            default: 0,
            description: "Records to skip for pagination (default 0)",
          },
          orderBy: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
            description: "Sort order by date (default: desc)",
          },
          includeSummary: {
            type: "boolean",
            default: false,
            description: "Include aggregated summary statistics",
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
    // Pumping tools
    else if (name.includes("pumping")) {
      result = await handlePumpingTools(name, args, prisma);
    }
    // Medicine tools
    else if (name.includes("medicine")) {
      result = await handleMedicineTools(name, args, prisma);
    }
    // Growth tools
    else if (name.includes("growth")) {
      result = await handleGrowthTools(name, args, prisma);
    }
    // Temperature tools
    else if (name.includes("temperature")) {
      result = await handleTemperatureTools(name, args, prisma);
    }
    // Activity tools
    else if (name.includes("activity")) {
      result = await handleActivityTools(name, args, prisma);
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
