import type { TRPCContext } from "../trpc";
import { prismaMock } from "./setup";

// Valid CUID format test IDs
export const TEST_IDS = {
  userId: "clq1234567890abcdefghij01",
  householdId: "clq1234567890abcdefghij02",
  childId: "clq1234567890abcdefghij03",
  membershipId: "clq1234567890abcdefghij04",
  sleepId: "clq1234567890abcdefghij05",
  feedingId: "clq1234567890abcdefghij06",
  diaperId: "clq1234567890abcdefghij07",
  inviteId: "clq1234567890abcdefghij08",
  pumpingId: "clq1234567890abcdefghij09",
  growthId: "clq1234567890abcdefghij10",
  activityId: "clq1234567890abcdefghij11",
  medicineId: "clq1234567890abcdefghij12",
  recordId: "clq1234567890abcdefghij13",
  temperatureId: "clq1234567890abcdefghij14",
} as const;

export function createTestUser(overrides?: Partial<TRPCContext["session"]>) {
  return {
    user: {
      id: TEST_IDS.userId,
      email: "test@example.com",
      name: "Test User",
      image: null,
      ...overrides?.user,
    },
  };
}

export function createTestContext(
  options: {
    session?: TRPCContext["session"];
  } = {}
): TRPCContext {
  return {
    prisma: prismaMock as unknown as TRPCContext["prisma"],
    session: options.session ?? createTestUser(),
    headers: new Headers(),
  };
}

export function createUnauthenticatedContext(): TRPCContext {
  return {
    prisma: prismaMock as unknown as TRPCContext["prisma"],
    session: null,
    headers: new Headers(),
  };
}

// Factory functions for test data
export function createTestHousehold(overrides?: Record<string, unknown>) {
  return {
    id: TEST_IDS.householdId,
    name: "Test Household",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestChild(overrides?: Record<string, unknown>) {
  return {
    id: TEST_IDS.childId,
    householdId: TEST_IDS.householdId,
    name: "Test Baby",
    birthDate: new Date("2024-01-01"),
    gender: null,
    photo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestMembership(overrides?: Record<string, unknown>) {
  return {
    id: TEST_IDS.membershipId,
    householdId: TEST_IDS.householdId,
    userId: TEST_IDS.userId,
    role: "OWNER" as const,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createTestSleepRecord(overrides?: Record<string, unknown>) {
  return {
    id: TEST_IDS.sleepId,
    childId: TEST_IDS.childId,
    startTime: new Date("2024-01-15T10:00:00"),
    endTime: new Date("2024-01-15T12:00:00"),
    sleepType: "NAP" as const,
    quality: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestFeedingRecord(overrides?: Record<string, unknown>) {
  return {
    id: TEST_IDS.feedingId,
    childId: TEST_IDS.childId,
    feedingType: "BREAST" as const,
    startTime: new Date("2024-01-15T10:00:00"),
    endTime: new Date("2024-01-15T10:30:00"),
    side: "LEFT" as const,
    amountMl: null,
    foodItems: [],
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestDiaperRecord(overrides?: Record<string, unknown>) {
  return {
    id: TEST_IDS.diaperId,
    childId: TEST_IDS.childId,
    time: new Date("2024-01-15T10:00:00"),
    diaperType: "WET" as const,
    color: null,
    consistency: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestInvite(overrides?: Record<string, unknown>) {
  return {
    id: TEST_IDS.inviteId,
    householdId: TEST_IDS.householdId,
    email: "invite@example.com",
    role: "CAREGIVER" as const,
    token: "test-token-123",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    ...overrides,
  };
}

export function createTestTemperatureRecord(overrides?: Record<string, unknown>) {
  return {
    id: TEST_IDS.temperatureId,
    childId: TEST_IDS.childId,
    time: new Date("2024-01-15T10:00:00"),
    temperatureCelsius: 37.0,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
