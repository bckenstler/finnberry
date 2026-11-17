import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const SESSION_CHILD_ID = "child-in-my-household";
const FOREIGN_CHILD_ID = "child-in-another-household";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findChild: vi.fn(),
  handleToolCall: vi.fn(),
  streamMessage: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));

vi.mock("@finnberry/db", () => ({
  prisma: { child: { findUnique: mocks.findChild } },
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { stream: mocks.streamMessage };
  },
}));

vi.mock("@finnberry/mcp-server/tools", () => ({
  registerTools: () => [
    {
      name: "log-diaper",
      description: "Log a diaper change",
      inputSchema: {
        type: "object",
        properties: { childId: { type: "string" }, diaperType: { type: "string" } },
        required: ["childId", "diaperType"],
      },
    },
    {
      name: "query-sleep-records",
      description: "Query sleep records",
      inputSchema: {
        type: "object",
        properties: { childId: { type: "string" } },
        required: ["childId"],
      },
    },
    {
      name: "end-sleep",
      description: "End a sleep session",
      inputSchema: {
        type: "object",
        properties: { sleepId: { type: "string" } },
        required: ["sleepId"],
      },
    },
    {
      name: "list-children",
      description: "List all children",
      inputSchema: { type: "object", properties: {} },
    },
  ],
  handleToolCall: mocks.handleToolCall,
}));

import { POST } from "./route";

interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

// One model turn: no streamed deltas, just the final message the route acts on.
function modelTurn(toolCalls: ToolCall[]) {
  return {
    [Symbol.asyncIterator]: async function* () {},
    finalMessage: async () => ({
      stop_reason: toolCalls.length > 0 ? "tool_use" : "end_turn",
      content: toolCalls.map((call, index) => ({
        type: "tool_use",
        id: `toolu_${index}`,
        ...call,
      })),
    }),
  };
}

function modelCallsTools(toolCalls: ToolCall[]) {
  mocks.streamMessage
    .mockReturnValueOnce(modelTurn(toolCalls))
    .mockReturnValueOnce(modelTurn([]));
}

function chatRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readEvents(response: Response) {
  const text = await response.text();
  return text
    .split("\n")
    .filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
    .map((line) => JSON.parse(line.slice("data: ".length)));
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.findChild.mockResolvedValue({
      id: SESSION_CHILD_ID,
      name: "Test Baby",
      birthDate: new Date("2024-01-01"),
      household: { members: [{ userId: "user-1" }] },
    });
    mocks.handleToolCall.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a request with no session", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await POST(
      chatRequest({ childId: SESSION_CHILD_ID, message: "hi" })
    );

    expect(response.status).toBe(401);
    expect(mocks.streamMessage).not.toHaveBeenCalled();
  });

  it("rejects a child outside the user's households", async () => {
    mocks.findChild.mockResolvedValue({
      id: FOREIGN_CHILD_ID,
      name: "Other Baby",
      birthDate: null,
      household: { members: [] },
    });

    const response = await POST(
      chatRequest({ childId: FOREIGN_CHILD_ID, message: "hi" })
    );

    expect(response.status).toBe(403);
    expect(mocks.streamMessage).not.toHaveBeenCalled();
  });

  it("does not offer list-children to the model", async () => {
    modelCallsTools([]);

    await readEvents(
      await POST(chatRequest({ childId: SESSION_CHILD_ID, message: "hi" }))
    );

    const offered = mocks.streamMessage.mock.calls[0]![0].tools.map(
      (tool: { name: string }) => tool.name
    );
    expect(offered).toEqual(["log-diaper", "query-sleep-records", "end-sleep"]);
  });

  it("replaces a childId chosen by the model with the authorized one", async () => {
    modelCallsTools([
      { name: "log-diaper", input: { childId: FOREIGN_CHILD_ID, diaperType: "WET" } },
      { name: "query-sleep-records", input: { childId: FOREIGN_CHILD_ID } },
    ]);

    await readEvents(
      await POST(chatRequest({ childId: SESSION_CHILD_ID, message: "log it" }))
    );

    expect(mocks.handleToolCall).toHaveBeenCalledTimes(2);
    expect(mocks.handleToolCall).toHaveBeenCalledWith(
      "log-diaper",
      { childId: SESSION_CHILD_ID, diaperType: "WET" },
      expect.anything()
    );
    expect(mocks.handleToolCall).toHaveBeenCalledWith(
      "query-sleep-records",
      { childId: SESSION_CHILD_ID },
      expect.anything()
    );
  });

  it("fills in the childId when the model leaves it out", async () => {
    modelCallsTools([{ name: "log-diaper", input: { diaperType: "DIRTY" } }]);

    await readEvents(
      await POST(chatRequest({ childId: SESSION_CHILD_ID, message: "log it" }))
    );

    expect(mocks.handleToolCall).toHaveBeenCalledWith(
      "log-diaper",
      { childId: SESSION_CHILD_ID, diaperType: "DIRTY" },
      expect.anything()
    );
  });

  it("does not add a childId to a tool that takes none", async () => {
    modelCallsTools([{ name: "end-sleep", input: { sleepId: "sleep-1" } }]);

    await readEvents(
      await POST(chatRequest({ childId: SESSION_CHILD_ID, message: "end it" }))
    );

    expect(mocks.handleToolCall).toHaveBeenCalledWith(
      "end-sleep",
      { sleepId: "sleep-1" },
      expect.anything()
    );
  });

  it("refuses a tool that was not offered and tells the model", async () => {
    modelCallsTools([{ name: "list-children", input: {} }]);

    const events = await readEvents(
      await POST(chatRequest({ childId: SESSION_CHILD_ID, message: "who else?" }))
    );

    expect(mocks.handleToolCall).not.toHaveBeenCalled();
    expect(events).toContainEqual(
      expect.objectContaining({ type: "tool_error", name: "list-children" })
    );

    const followUp = mocks.streamMessage.mock.calls[1]![0].messages.at(-1);
    expect(followUp.content).toEqual([
      expect.objectContaining({ type: "tool_result", is_error: true }),
    ]);
  });
});
