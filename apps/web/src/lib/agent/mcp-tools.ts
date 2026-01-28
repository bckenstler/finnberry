import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { registerTools, handleToolCall } from "@finnberry/mcp-server/tools";
import type { PrismaClient } from "@finnberry/db";
import { z } from "zod";

/**
 * Converts JSON Schema property definitions to Zod schema.
 * This is a simplified converter for the MCP tool schemas.
 */
function jsonSchemaPropertyToZod(
  property: Record<string, unknown>
): z.ZodTypeAny {
  const type = property.type as string;

  switch (type) {
    case "string": {
      let schema = z.string();
      if (property.enum) {
        return z.enum(property.enum as [string, ...string[]]);
      }
      if (property.format === "date-time" || property.format === "date") {
        schema = schema.describe(
          (property.description as string) || "ISO 8601 date/time string"
        );
      }
      return schema;
    }
    case "number":
      return z.number();
    case "boolean":
      return z.boolean();
    case "array":
      return z.array(z.string()); // Simplified - assumes string arrays
    default:
      return z.unknown();
  }
}

/**
 * Converts an MCP tool's JSON Schema to a Zod schema.
 */
function convertInputSchemaToZod(
  inputSchema: Record<string, unknown>
): z.ZodRawShape {
  const properties = (inputSchema.properties as Record<string, Record<string, unknown>>) || {};
  const required = (inputSchema.required as string[]) || [];

  const zodShape: z.ZodRawShape = {};

  for (const [key, prop] of Object.entries(properties)) {
    let zodProp = jsonSchemaPropertyToZod(prop);

    // Add description if present
    if (prop.description) {
      zodProp = zodProp.describe(prop.description as string);
    }

    // Make optional if not required
    if (!required.includes(key)) {
      zodProp = zodProp.optional();
    }

    zodShape[key] = zodProp;
  }

  return zodShape;
}

/**
 * Creates an SDK MCP server with Finnberry tools.
 *
 * @param prisma - Prisma client instance
 * @param childId - Child ID to inject into tool calls that require it
 * @returns MCP server configuration for the Claude Agent SDK
 */
export function createFinnberryMcpServer(
  prisma: PrismaClient,
  childId: string
) {
  const mcpTools = registerTools();

  // Convert MCP tools to SDK tool format
  const sdkTools = mcpTools.map((mcpTool) => {
    const zodSchema = convertInputSchemaToZod(
      mcpTool.inputSchema as Record<string, unknown>
    );

    return tool(
      mcpTool.name,
      mcpTool.description ?? "",
      zodSchema,
      async (args) => {
        // Inject childId for tools that need it but don't have it
        const enrichedArgs: Record<string, unknown> = { ...args };

        // If the tool requires childId and it's not provided, inject it
        const toolsRequiringChildId = [
          "start-sleep",
          "log-sleep",
          "get-sleep-summary",
          "log-breastfeeding",
          "log-bottle",
          "log-solids",
          "get-feeding-summary",
          "log-diaper",
          "get-diaper-summary",
          "start-pumping",
          "log-pumping",
          "get-pumping-summary",
          "create-medicine",
          "list-medicines",
          "log-growth",
          "get-growth-records",
          "get-latest-growth",
          "log-temperature",
          "get-temperature-records",
          "get-latest-temperature",
          "start-activity",
          "log-activity",
          "get-activity-summary",
          "get-daily-summary",
        ];

        if (
          toolsRequiringChildId.includes(mcpTool.name) &&
          !enrichedArgs.childId
        ) {
          enrichedArgs.childId = childId;
        }

        // Call the MCP tool handler
        const result = await handleToolCall(mcpTool.name, enrichedArgs, prisma);

        return result;
      }
    );
  });

  return createSdkMcpServer({
    name: "finnberry",
    version: "1.0.0",
    tools: sdkTools,
  });
}

/**
 * Generates a system prompt for the Finnberry chat agent.
 */
export function generateSystemPrompt(
  childName: string,
  childBirthDate: Date | null
): string {
  const age = childBirthDate
    ? formatAge(childBirthDate)
    : "unknown age";

  return `You are Finnberry, a helpful assistant for tracking baby activities.
You are helping track activities for ${childName}, who is ${age}.

Available tools allow you to:
- Log and query sleep (start-sleep, end-sleep, log-sleep, get-sleep-summary)
- Log and query feedings (log-breastfeeding, log-bottle, log-solids, get-feeding-summary)
- Log and query diapers (log-diaper, get-diaper-summary)
- Log and query pumping (start-pumping, end-pumping, log-pumping, get-pumping-summary)
- Manage medicines (create-medicine, list-medicines, log-medicine, get-medicine-records)
- Log growth measurements (log-growth, get-growth-records, get-latest-growth)
- Log temperature (log-temperature, get-temperature-records, get-latest-temperature)
- Log activities like tummy time, bath, play (start-activity, end-activity, log-activity, get-activity-summary)
- Get daily summaries (get-daily-summary)

When logging activities:
- For times, assume "now" if not specified
- For durations, help the user estimate if they say things like "for about 30 minutes"
- Be concise but friendly in responses
- Confirm what was logged after each action

Current time: ${new Date().toISOString()}`;
}

/**
 * Formats a child's age from their birth date.
 */
function formatAge(birthDate: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - birthDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} old`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks !== 1 ? "s" : ""} old`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months !== 1 ? "s" : ""} old`;
  } else {
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    if (months > 0) {
      return `${years} year${years !== 1 ? "s" : ""} and ${months} month${months !== 1 ? "s" : ""} old`;
    }
    return `${years} year${years !== 1 ? "s" : ""} old`;
  }
}
