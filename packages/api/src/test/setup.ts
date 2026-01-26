import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@finnberry/db";

// Create the mock and store it in globalThis for proper access
const createPrismaMock = () => mockDeep<PrismaClient>();
(globalThis as Record<string, unknown>).__prismaMock__ =
  (globalThis as Record<string, unknown>).__prismaMock__ ?? createPrismaMock();

export const prismaMock = (globalThis as Record<string, unknown>)
  .__prismaMock__ as DeepMockProxy<PrismaClient>;

// Mock the @finnberry/db module
vi.mock("@finnberry/db", () => ({
  prisma: (globalThis as Record<string, unknown>).__prismaMock__,
}));

beforeEach(() => {
  mockReset(prismaMock);
});
