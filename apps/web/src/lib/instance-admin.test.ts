import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => {
  class PrismaClientKnownRequestError extends Error {
    constructor(public code: string) {
      super(code);
    }
  }
  return {
    PrismaClientKnownRequestError,
    findClaim: vi.fn(),
    createClaim: vi.fn(),
    updateUser: vi.fn(),
    transaction: vi.fn(),
  };
});

vi.mock("@finnberry/db", () => ({
  Prisma: { PrismaClientKnownRequestError: mocks.PrismaClientKnownRequestError },
  prisma: {
    instanceAdminClaim: { findUnique: mocks.findClaim, create: mocks.createClaim },
    user: { update: mocks.updateUser },
    $transaction: mocks.transaction,
  },
}));

import { claimInstanceAdmin, mayClaimInstanceAdmin } from "./instance-admin";

const user = { id: "user-1", email: "parent@example.com" };

describe("mayClaimInstanceAdmin", () => {
  it("lets any address claim when no admin email is pinned", () => {
    expect(mayClaimInstanceAdmin("anyone@example.com", undefined)).toBe(true);
    expect(mayClaimInstanceAdmin("anyone@example.com", "   ")).toBe(true);
  });

  it("lets only the pinned address claim", () => {
    expect(mayClaimInstanceAdmin("parent@example.com", "parent@example.com")).toBe(true);
    expect(mayClaimInstanceAdmin("stranger@example.com", "parent@example.com")).toBe(false);
  });

  it("ignores case and surrounding spaces", () => {
    expect(mayClaimInstanceAdmin("Parent@Example.com", " parent@example.COM ")).toBe(true);
  });

  it("refuses an account with no email when an address is pinned", () => {
    expect(mayClaimInstanceAdmin(null, "parent@example.com")).toBe(false);
  });
});

describe("claimInstanceAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_EMAIL", "");
    mocks.findClaim.mockResolvedValue(null);
    mocks.transaction.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("makes the first account the approved admin", async () => {
    await expect(claimInstanceAdmin(user)).resolves.toBe(true);

    expect(mocks.createClaim).toHaveBeenCalledWith({
      data: { id: 1, userId: "user-1" },
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { isAdmin: true, status: "APPROVED" },
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("does nothing once an admin exists", async () => {
    mocks.findClaim.mockResolvedValue({ id: 1 });

    await expect(claimInstanceAdmin(user)).resolves.toBe(false);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("loses cleanly when another sign-in takes the claim first", async () => {
    mocks.transaction.mockRejectedValue(new mocks.PrismaClientKnownRequestError("P2002"));

    await expect(claimInstanceAdmin(user)).resolves.toBe(false);
  });

  it("does not hide a database failure", async () => {
    mocks.transaction.mockRejectedValue(new Error("connection lost"));

    await expect(claimInstanceAdmin(user)).rejects.toThrow("connection lost");
  });

  it("does not let another address claim when an admin email is pinned", async () => {
    vi.stubEnv("ADMIN_EMAIL", "owner@example.com");

    await expect(claimInstanceAdmin(user)).resolves.toBe(false);
    expect(mocks.findClaim).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("lets the pinned address claim", async () => {
    vi.stubEnv("ADMIN_EMAIL", "Parent@Example.com");

    await expect(claimInstanceAdmin(user)).resolves.toBe(true);
  });
});
