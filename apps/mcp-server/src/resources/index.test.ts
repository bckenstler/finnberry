import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerResources, handleResourceRead } from "./index";

// Mock Prisma client
const mockPrisma = {
  child: {
    findMany: vi.fn(),
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

describe("registerResources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns base children resource", async () => {
    mockPrisma.child.findMany.mockResolvedValue([]);

    const resources = await registerResources(mockPrisma);

    expect(resources).toContainEqual({
      uri: "finnberry://children",
      name: "All Children",
      description: "List of all children you have access to",
      mimeType: "application/json",
    });
  });

  it("creates resources for each child", async () => {
    mockPrisma.child.findMany.mockResolvedValue([
      { id: "child-1", name: "Emma" },
      { id: "child-2", name: "Liam" },
    ]);

    const resources = await registerResources(mockPrisma);

    // Should have base resource + 4 resources per child
    expect(resources.length).toBe(1 + 2 * 4);

    // Check child profile resources exist
    expect(resources).toContainEqual(
      expect.objectContaining({
        uri: "finnberry://children/child-1",
        name: "Emma - Profile",
      })
    );
    expect(resources).toContainEqual(
      expect.objectContaining({
        uri: "finnberry://children/child-2",
        name: "Liam - Profile",
      })
    );

    // Check today's activity resources exist
    expect(resources).toContainEqual(
      expect.objectContaining({
        uri: "finnberry://children/child-1/today",
        name: "Emma - Today's Activity",
      })
    );

    // Check sleep and feeding resources exist
    expect(resources).toContainEqual(
      expect.objectContaining({
        uri: "finnberry://children/child-1/sleep?period=week",
      })
    );
    expect(resources).toContainEqual(
      expect.objectContaining({
        uri: "finnberry://children/child-1/feeding?period=week",
      })
    );
  });

  it("returns empty resources array when no children", async () => {
    mockPrisma.child.findMany.mockResolvedValue([]);

    const resources = await registerResources(mockPrisma);

    expect(resources.length).toBe(1); // Only base children resource
  });
});

describe("handleResourceRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("finnberry://children", () => {
    it("returns all children with age calculation", async () => {
      const birthDate = new Date();
      birthDate.setMonth(birthDate.getMonth() - 3);
      birthDate.setDate(birthDate.getDate() - 15);

      mockPrisma.child.findMany.mockResolvedValue([
        {
          id: "child-1",
          name: "Emma",
          birthDate,
          gender: "FEMALE",
          household: { name: "Smith Family" },
        },
      ]);

      const result = await handleResourceRead("finnberry://children", mockPrisma);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]!.uri).toBe("finnberry://children");
      expect(result.contents[0]!.mimeType).toBe("application/json");

      const data = JSON.parse(result.contents[0]!.text);
      expect(data.children).toHaveLength(1);
      expect(data.children[0].name).toBe("Emma");
      expect(data.children[0].household).toBe("Smith Family");
      expect(data.children[0].age).toMatch(/\d+ months?, \d+ days?/);
    });
  });

  describe("finnberry://children/{id}", () => {
    it("returns child profile", async () => {
      const birthDate = new Date("2024-01-01");
      mockPrisma.child.findUnique.mockResolvedValue({
        id: "child-1",
        name: "Emma",
        birthDate,
        gender: "FEMALE",
        household: { name: "Smith Family" },
      });

      const result = await handleResourceRead(
        "finnberry://children/child-1",
        mockPrisma
      );

      const data = JSON.parse(result.contents[0]!.text);
      expect(data.id).toBe("child-1");
      expect(data.name).toBe("Emma");
      expect(data.gender).toBe("FEMALE");
      expect(data.birthDate).toBe("2024-01-01");
    });

    it("throws error when child not found", async () => {
      mockPrisma.child.findUnique.mockResolvedValue(null);

      await expect(
        handleResourceRead("finnberry://children/non-existent", mockPrisma)
      ).rejects.toThrow("Child not found");
    });
  });

  describe("finnberry://children/{id}/today", () => {
    it("returns today's activity summary", async () => {
      mockPrisma.child.findUnique.mockResolvedValue({ name: "Emma" });
      mockPrisma.sleepRecord.findMany.mockResolvedValue([
        {
          id: "sleep-1",
          sleepType: "NAP",
          startTime: new Date("2024-01-15T10:00:00"),
          endTime: new Date("2024-01-15T11:30:00"),
          quality: 4,
        },
      ]);
      mockPrisma.feedingRecord.findMany.mockResolvedValue([
        {
          id: "feed-1",
          feedingType: "BREAST",
          startTime: new Date("2024-01-15T08:00:00"),
          side: "LEFT",
          amountMl: null,
          foodItems: [],
        },
      ]);
      mockPrisma.diaperRecord.findMany.mockResolvedValue([
        {
          id: "diaper-1",
          diaperType: "WET",
          time: new Date("2024-01-15T09:00:00"),
          color: null,
        },
      ]);

      const result = await handleResourceRead(
        "finnberry://children/child-1/today",
        mockPrisma
      );

      const data = JSON.parse(result.contents[0]!.text);
      expect(data.childName).toBe("Emma");
      expect(data.summary.sleepSessions).toBe(1);
      expect(data.summary.feedings).toBe(1);
      expect(data.summary.diaperChanges).toBe(1);
      expect(data.sleep).toHaveLength(1);
      expect(data.feeding).toHaveLength(1);
      expect(data.diapers).toHaveLength(1);
    });

    it("calculates total sleep correctly", async () => {
      mockPrisma.child.findUnique.mockResolvedValue({ name: "Emma" });
      mockPrisma.sleepRecord.findMany.mockResolvedValue([
        {
          id: "sleep-1",
          sleepType: "NAP",
          startTime: new Date("2024-01-15T10:00:00"),
          endTime: new Date("2024-01-15T11:00:00"),
          quality: null,
        },
        {
          id: "sleep-2",
          sleepType: "NAP",
          startTime: new Date("2024-01-15T14:00:00"),
          endTime: new Date("2024-01-15T14:30:00"),
          quality: null,
        },
      ]);
      mockPrisma.feedingRecord.findMany.mockResolvedValue([]);
      mockPrisma.diaperRecord.findMany.mockResolvedValue([]);

      const result = await handleResourceRead(
        "finnberry://children/child-1/today",
        mockPrisma
      );

      const data = JSON.parse(result.contents[0]!.text);
      expect(data.summary.totalSleep).toBe("1h 30m"); // 60 + 30 minutes
    });

    it("throws error when child not found", async () => {
      mockPrisma.child.findUnique.mockResolvedValue(null);

      await expect(
        handleResourceRead("finnberry://children/non-existent/today", mockPrisma)
      ).rejects.toThrow("Child not found");
    });
  });

  describe("finnberry://children/{id}/sleep", () => {
    it("returns sleep records for the week by default", async () => {
      mockPrisma.sleepRecord.findMany.mockResolvedValue([
        {
          id: "sleep-1",
          sleepType: "NAP",
          startTime: new Date("2024-01-15T10:00:00"),
          endTime: new Date("2024-01-15T11:30:00"),
          quality: 4,
        },
      ]);

      const result = await handleResourceRead(
        "finnberry://children/child-1/sleep?period=week",
        mockPrisma
      );

      const data = JSON.parse(result.contents[0]!.text);
      expect(data.period).toBe("week");
      expect(data.records).toHaveLength(1);
      expect(data.records[0].duration).toBe("1h 30m");
    });

    it("handles ongoing sleep records", async () => {
      mockPrisma.sleepRecord.findMany.mockResolvedValue([
        {
          id: "sleep-1",
          sleepType: "NAP",
          startTime: new Date("2024-01-15T10:00:00"),
          endTime: null,
          quality: null,
        },
      ]);

      const result = await handleResourceRead(
        "finnberry://children/child-1/sleep?period=week",
        mockPrisma
      );

      const data = JSON.parse(result.contents[0]!.text);
      expect(data.records[0].duration).toBe("ongoing");
    });
  });

  describe("finnberry://children/{id}/feeding", () => {
    it("returns feeding records for the week", async () => {
      mockPrisma.feedingRecord.findMany.mockResolvedValue([
        {
          id: "feed-1",
          feedingType: "BOTTLE",
          startTime: new Date("2024-01-15T08:00:00"),
          endTime: new Date("2024-01-15T08:20:00"),
          side: null,
          amountMl: 180,
          foodItems: [],
        },
      ]);

      const result = await handleResourceRead(
        "finnberry://children/child-1/feeding?period=week",
        mockPrisma
      );

      const data = JSON.parse(result.contents[0]!.text);
      expect(data.period).toBe("week");
      expect(data.records).toHaveLength(1);
      expect(data.records[0].amountMl).toBe(180);
      expect(data.records[0].duration).toBe("20m");
    });

    it("handles different period values", async () => {
      mockPrisma.feedingRecord.findMany.mockResolvedValue([]);

      const result = await handleResourceRead(
        "finnberry://children/child-1/feeding?period=month",
        mockPrisma
      );

      const data = JSON.parse(result.contents[0]!.text);
      expect(data.period).toBe("month");
    });
  });

  describe("unknown resources", () => {
    it("throws error for unknown resource URI", async () => {
      await expect(
        handleResourceRead("finnberry://unknown/resource", mockPrisma)
      ).rejects.toThrow("Unknown resource");
    });
  });
});
