import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const SECRET = "a-long-enough-test-secret";

const mocks = vi.hoisted(() => ({
  upsertUser: vi.fn(),
  findUser: vi.fn(),
  findManyUsers: vi.fn(),
  deleteManyUsers: vi.fn(),
  createSession: vi.fn(),
  findManyChildren: vi.fn(),
  deleteManyChildren: vi.fn(),
  findManyHouseholds: vi.fn(),
}));

vi.mock("@finnberry/db", () => ({
  prisma: {
    user: {
      upsert: mocks.upsertUser,
      findUnique: mocks.findUser,
      findMany: mocks.findManyUsers,
      deleteMany: mocks.deleteManyUsers,
    },
    session: { create: mocks.createSession },
    child: { findMany: mocks.findManyChildren, deleteMany: mocks.deleteManyChildren },
    household: { findMany: mocks.findManyHouseholds },
  },
}));

import { POST } from "./route";

function seedRequest(body: unknown, secret: string | null = SECRET) {
  return new Request("http://localhost/api/test/seed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret === null ? {} : { "x-test-seed-secret": secret }),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const createUser = {
  action: "createTestUser",
  email: "e2e-test-1@example.com",
  name: "e2e-test User",
};

describe("POST /api/test/seed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ENABLE_TEST_SEED", "1");
    vi.stubEnv("TEST_SEED_SECRET", SECRET);
    mocks.upsertUser.mockResolvedValue({ id: "user-1" });
    mocks.findManyChildren.mockResolvedValue([]);
    mocks.findManyHouseholds.mockResolvedValue([]);
    mocks.findManyUsers.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("when the endpoint is not deliberately enabled", () => {
    async function expectHidden(response: Response) {
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("");
      expect(mocks.upsertUser).not.toHaveBeenCalled();
    }

    it("is hidden in a production build even with the flag and secret", async () => {
      vi.stubEnv("NODE_ENV", "production");
      await expectHidden(await POST(seedRequest(createUser)));
    });

    it("is hidden in development without the opt-in flag", async () => {
      vi.stubEnv("ENABLE_TEST_SEED", "");
      await expectHidden(await POST(seedRequest(createUser)));
    });

    it("is hidden when no secret is configured, even to an empty secret", async () => {
      vi.stubEnv("TEST_SEED_SECRET", "");
      await expectHidden(await POST(seedRequest(createUser, "")));
    });

    it("is hidden when the configured secret is too short to be one", async () => {
      vi.stubEnv("TEST_SEED_SECRET", "short");
      await expectHidden(await POST(seedRequest(createUser, "short")));
    });

    it("is hidden from a caller with the wrong secret", async () => {
      await expectHidden(await POST(seedRequest(createUser, "not-the-secret-at-all")));
    });

    it("is hidden from a caller with no secret", async () => {
      await expectHidden(await POST(seedRequest(createUser, null)));
    });
  });

  it("creates an approved test user for a caller with the secret", async () => {
    const response = await POST(seedRequest(createUser));

    expect(response.status).toBe(200);
    expect(mocks.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "e2e-test-1@example.com" },
        create: expect.objectContaining({ status: "APPROVED" }),
      })
    );
  });

  it("refuses to create or overwrite a user outside the test prefix", async () => {
    const response = await POST(
      seedRequest({ ...createUser, email: "parent@example.com" })
    );

    expect(response.status).toBe(400);
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });

  it("refuses to sign in as a user outside the test prefix", async () => {
    mocks.findUser.mockResolvedValue({ email: "parent@example.com" });

    const response = await POST(
      seedRequest({ action: "createTestSession", userId: "real-user" })
    );

    expect(response.status).toBe(400);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("signs in as a test user", async () => {
    mocks.findUser.mockResolvedValue({ email: "e2e-test-1@example.com" });
    mocks.createSession.mockResolvedValue({ id: "session-1" });

    const response = await POST(
      seedRequest({ action: "createTestSession", userId: "user-1" })
    );

    expect(response.status).toBe(200);
    expect(mocks.createSession).toHaveBeenCalledTimes(1);
  });

  it("cleans up only test-prefixed data, whatever prefix the caller sends", async () => {
    const response = await POST(seedRequest({ action: "cleanup", prefix: "" }));

    expect(response.status).toBe(200);
    expect(mocks.deleteManyUsers).toHaveBeenCalledWith({
      where: { email: { startsWith: "e2e-test" } },
    });
    expect(mocks.deleteManyChildren).toHaveBeenCalledWith({
      where: { name: { startsWith: "e2e-test" } },
    });
  });

  it.each([
    ["an unknown action", { action: "dropEverything" }],
    ["a body that is not JSON", "not json"],
    ["a missing field", { action: "createTestUser", email: "e2e-test-1@example.com" }],
  ])("rejects %s", async (_label, body) => {
    const response = await POST(seedRequest(body));

    expect(response.status).toBe(400);
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });
});
