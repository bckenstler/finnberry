import { auth } from "@/lib/auth";
import { prisma } from "@finnberry/db";
import Anthropic from "@anthropic-ai/sdk";
import { registerTools, handleToolCall } from "@finnberry/mcp-server/tools";

export const runtime = "nodejs";
// Configure based on your Vercel plan: Hobby=10, Pro=60, Enterprise=900
export const maxDuration = 60;

type ModelId = "haiku" | "sonnet" | "opus";

const MODEL_MAP: Record<ModelId, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-5-20250929",
  opus: "claude-opus-4-5-20251101",
};

interface ChatRequest {
  childId: string;
  message: string;
  model?: ModelId;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

// Convert MCP tool definitions to Anthropic tool format
function convertToolsToAnthropicFormat(): Anthropic.Tool[] {
  const mcpTools = registerTools();
  return mcpTools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? "",
    input_schema: tool.inputSchema as Anthropic.Tool["input_schema"],
  }));
}

// Generate system prompt for the chat
function generateSystemPrompt(
  childId: string,
  childName: string,
  childBirthDate: Date | null
): string {
  const age = childBirthDate ? formatAge(childBirthDate) : "unknown age";

  return `You are Finnberry, a helpful assistant for tracking baby activities.
You are helping track activities for ${childName}, who is ${age}.

IMPORTANT: The current child's ID is: ${childId}
Always use this childId when calling tools. Do NOT call list-children to look up the ID.

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

export async function POST(request: Request) {
  try {
    // Validate session
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body: ChatRequest = await request.json();
    const { childId, message, model = "sonnet", conversationHistory = [] } = body;

    if (!childId || !message) {
      return new Response(
        JSON.stringify({ error: "Missing childId or message" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify user has access to this child via household membership
    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: {
        household: {
          include: {
            members: {
              where: { userId: session.user.id },
            },
          },
        },
      },
    });

    if (!child || child.household.members.length === 0) {
      return new Response(
        JSON.stringify({ error: "Access denied to this child" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Chat feature not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const systemPrompt = generateSystemPrompt(childId, child.name, child.birthDate);
    const tools = convertToolsToAnthropicFormat();

    // Tools that need childId injected
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

    // Build messages array
    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages = [...messages];
          let continueLoop = true;

          while (continueLoop) {
            // Create a streaming message
            const streamResponse = anthropic.messages.stream({
              model: MODEL_MAP[model] || MODEL_MAP.sonnet,
              max_tokens: 4096,
              system: systemPrompt,
              tools,
              messages: currentMessages,
            });

            let fullResponse: Anthropic.Message | null = null;
            let currentText = "";

            // Stream the response
            for await (const event of streamResponse) {
              if (event.type === "content_block_delta") {
                const delta = event.delta;
                if ("text" in delta) {
                  currentText += delta.text;
                  // Send text delta to client
                  const data = JSON.stringify({
                    type: "text_delta",
                    text: delta.text,
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
              } else if (event.type === "message_start") {
                // Send message start
                const data = JSON.stringify({
                  type: "message_start",
                  id: event.message.id,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              } else if (event.type === "content_block_start") {
                if (event.content_block.type === "tool_use") {
                  // Send tool use start
                  const data = JSON.stringify({
                    type: "tool_use_start",
                    id: event.content_block.id,
                    name: event.content_block.name,
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
              }
            }

            // Get the final message
            fullResponse = await streamResponse.finalMessage();

            // Check if we need to handle tool use
            const toolUseBlocks = fullResponse.content.filter(
              (block): block is Anthropic.ToolUseBlock =>
                block.type === "tool_use"
            );

            if (toolUseBlocks.length > 0 && fullResponse.stop_reason === "tool_use") {
              // Process tool calls
              const toolResults: Anthropic.ToolResultBlockParam[] = [];

              for (const toolUse of toolUseBlocks) {
                // Inject childId if needed
                const toolInput = { ...(toolUse.input as Record<string, unknown>) };
                if (
                  toolsRequiringChildId.includes(toolUse.name) &&
                  !toolInput.childId
                ) {
                  toolInput.childId = childId;
                }

                // Send tool execution start
                const toolStartData = JSON.stringify({
                  type: "tool_executing",
                  id: toolUse.id,
                  name: toolUse.name,
                  input: toolInput,
                });
                controller.enqueue(encoder.encode(`data: ${toolStartData}\n\n`));

                try {
                  // Execute the tool
                  const result = await handleToolCall(
                    toolUse.name,
                    toolInput,
                    prisma
                  );

                  const resultText = result.content[0]?.text ?? "No result";

                  // Send tool result
                  const toolResultData = JSON.stringify({
                    type: "tool_result",
                    id: toolUse.id,
                    name: toolUse.name,
                    result: resultText,
                  });
                  controller.enqueue(encoder.encode(`data: ${toolResultData}\n\n`));

                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: toolUse.id,
                    content: resultText,
                  });
                } catch (error) {
                  const errorMessage =
                    error instanceof Error ? error.message : "Tool execution failed";

                  // Send tool error
                  const toolErrorData = JSON.stringify({
                    type: "tool_error",
                    id: toolUse.id,
                    name: toolUse.name,
                    error: errorMessage,
                  });
                  controller.enqueue(encoder.encode(`data: ${toolErrorData}\n\n`));

                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: toolUse.id,
                    content: `Error: ${errorMessage}`,
                    is_error: true,
                  });
                }
              }

              // Add assistant message and tool results to continue the conversation
              currentMessages = [
                ...currentMessages,
                { role: "assistant" as const, content: fullResponse.content },
                { role: "user" as const, content: toolResults },
              ];
            } else {
              // No more tool use, we're done
              continueLoop = false;
            }
          }

          // Signal end of stream
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Chat stream error:", error);
          const errorMessage = JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
          controller.enqueue(encoder.encode(`data: ${errorMessage}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
