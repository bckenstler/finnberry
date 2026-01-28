import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerPrompts, handlePromptGet } from "./index";

// Mock Prisma client
const mockPrisma = {
  child: {
    findUnique: vi.fn(),
  },
  sleepRecord: {
    findMany: vi.fn(),
  },
  feedingRecord: {
    findMany: vi.fn(),
  },
  diaperRecord: {
    findMany: vi.fn(),
  },
} as any;

describe("registerPrompts", () => {
  it("returns array of available prompts", () => {
    const prompts = registerPrompts();

    expect(prompts).toBeInstanceOf(Array);
    expect(prompts.length).toBeGreaterThan(0);
  });

  it("includes analyze-sleep-patterns prompt", () => {
    const prompts = registerPrompts();

    const sleepPrompt = prompts.find((p) => p.name === "analyze-sleep-patterns");
    expect(sleepPrompt).toBeDefined();
    expect(sleepPrompt?.description).toContain("sleep patterns");
    expect(sleepPrompt?.arguments).toContainEqual(
      expect.objectContaining({
        name: "childId",
        required: true,
      })
    );
  });

  it("includes daily-summary prompt", () => {
    const prompts = registerPrompts();

    const dailyPrompt = prompts.find((p) => p.name === "daily-summary");
    expect(dailyPrompt).toBeDefined();
    expect(dailyPrompt?.description).toContain("daily summary");
    expect(dailyPrompt?.arguments).toContainEqual(
      expect.objectContaining({
        name: "childId",
        required: true,
      })
    );
    expect(dailyPrompt?.arguments).toContainEqual(
      expect.objectContaining({
        name: "date",
        required: false,
      })
    );
  });
});

describe("handlePromptGet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("analyze-sleep-patterns", () => {
    it("returns prompt messages with sleep data", async () => {
      mockPrisma.child.findUnique.mockResolvedValue({
        name: "Emma",
        birthDate: new Date("2024-01-01"),
      });
      mockPrisma.sleepRecord.findMany.mockResolvedValue([
        {
          id: "sleep-1",
          sleepType: "NAP",
          startTime: new Date("2024-01-10T10:00:00"),
          endTime: new Date("2024-01-10T11:30:00"),
          quality: 4,
        },
        {
          id: "sleep-2",
          sleepType: "NIGHT",
          startTime: new Date("2024-01-10T19:00:00"),
          endTime: new Date("2024-01-11T06:00:00"),
          quality: 5,
        },
      ]);

      const result = await handlePromptGet(
        "analyze-sleep-patterns",
        { childId: "child-1" },
        mockPrisma
      );

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]!.role).toBe("user");
      expect(result.messages[0]!.content.type).toBe("text");

      const content = result.messages[0]!.content as { type: "text"; text: string };
      expect(content.text).toContain("Emma");
      expect(content.text).toContain("sleep patterns");
      expect(content.text).toContain("naps"); // lowercase in JSON structure
      expect(content.text).toContain("nightSleep");
    });

    it("throws error when child not found", async () => {
      mockPrisma.child.findUnique.mockResolvedValue(null);

      await expect(
        handlePromptGet("analyze-sleep-patterns", { childId: "non-existent" }, mockPrisma)
      ).rejects.toThrow("Child not found");
    });

    it("queries only completed sleep records", async () => {
      mockPrisma.child.findUnique.mockResolvedValue({
        name: "Emma",
        birthDate: new Date("2024-01-01"),
      });
      mockPrisma.sleepRecord.findMany.mockResolvedValue([]);

      await handlePromptGet(
        "analyze-sleep-patterns",
        { childId: "child-1" },
        mockPrisma
      );

      expect(mockPrisma.sleepRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            childId: "child-1",
            endTime: { not: null },
          }),
        })
      );
    });
  });

  describe("daily-summary", () => {
    it("returns daily summary prompt with all activity types", async () => {
      mockPrisma.child.findUnique.mockResolvedValue({
        name: "Emma",
        birthDate: new Date("2024-01-01"),
      });
      mockPrisma.sleepRecord.findMany.mockResolvedValue([
        {
          id: "sleep-1",
          sleepType: "NAP",
          startTime: new Date("2024-01-15T10:00:00"),
          endTime: new Date("2024-01-15T11:00:00"),
        },
      ]);
      mockPrisma.feedingRecord.findMany.mockResolvedValue([
        {
          id: "feed-1",
          feedingType: "BREAST",
          startTime: new Date("2024-01-15T08:00:00"),
          amountMl: null,
        },
        {
          id: "feed-2",
          feedingType: "BOTTLE",
          startTime: new Date("2024-01-15T12:00:00"),
          amountMl: 180,
        },
      ]);
      mockPrisma.diaperRecord.findMany.mockResolvedValue([
        { id: "diaper-1", diaperType: "WET" },
        { id: "diaper-2", diaperType: "DIRTY" },
        { id: "diaper-3", diaperType: "BOTH" },
      ]);

      const result = await handlePromptGet(
        "daily-summary",
        { childId: "child-1" },
        mockPrisma
      );

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]!.role).toBe("user");

      const content = result.messages[0]!.content as { type: "text"; text: string };
      expect(content.text).toContain("Emma");
      expect(content.text).toContain("Breastfeeding sessions: 1");
      expect(content.text).toContain("Bottle feedings: 1");
      expect(content.text).toContain("180ml total");
      expect(content.text).toContain("Wet: 2"); // WET + BOTH
      expect(content.text).toContain("Dirty: 2"); // DIRTY + BOTH
    });

    it("uses provided date when specified", async () => {
      mockPrisma.child.findUnique.mockResolvedValue({
        name: "Emma",
        birthDate: new Date("2024-01-01"),
      });
      mockPrisma.sleepRecord.findMany.mockResolvedValue([]);
      mockPrisma.feedingRecord.findMany.mockResolvedValue([]);
      mockPrisma.diaperRecord.findMany.mockResolvedValue([]);

      await handlePromptGet(
        "daily-summary",
        { childId: "child-1", date: "2024-01-10" },
        mockPrisma
      );

      // Check that queries filter by the provided date
      expect(mockPrisma.sleepRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            childId: "child-1",
            startTime: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it("throws error when child not found", async () => {
      mockPrisma.child.findUnique.mockResolvedValue(null);

      await expect(
        handlePromptGet("daily-summary", { childId: "non-existent" }, mockPrisma)
      ).rejects.toThrow("Child not found");
    });

    it("calculates total sleep duration correctly", async () => {
      mockPrisma.child.findUnique.mockResolvedValue({
        name: "Emma",
        birthDate: new Date("2024-01-01"),
      });
      mockPrisma.sleepRecord.findMany.mockResolvedValue([
        {
          id: "sleep-1",
          sleepType: "NAP",
          startTime: new Date("2024-01-15T10:00:00"),
          endTime: new Date("2024-01-15T11:00:00"),
        },
        {
          id: "sleep-2",
          sleepType: "NAP",
          startTime: new Date("2024-01-15T14:00:00"),
          endTime: new Date("2024-01-15T14:30:00"),
        },
        // Ongoing sleep - should be excluded from calculation
        {
          id: "sleep-3",
          sleepType: "NAP",
          startTime: new Date("2024-01-15T16:00:00"),
          endTime: null,
        },
      ]);
      mockPrisma.feedingRecord.findMany.mockResolvedValue([]);
      mockPrisma.diaperRecord.findMany.mockResolvedValue([]);

      const result = await handlePromptGet(
        "daily-summary",
        { childId: "child-1" },
        mockPrisma
      );

      const content = result.messages[0]!.content as { type: "text"; text: string };
      expect(content.text).toContain("1h 30m"); // 60 + 30 minutes
    });
  });

  describe("unknown prompt", () => {
    it("throws error for unknown prompt name", async () => {
      await expect(
        handlePromptGet("unknown-prompt", { childId: "child-1" }, mockPrisma)
      ).rejects.toThrow("Unknown prompt: unknown-prompt");
    });
  });
});
