import { describe, it, expect, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { prismaMock } from "../test/setup";
import {
  createTestContext,
  createTestUser,
  createTestHousehold,
  createTestMembership,
  createTestInvite,
  TEST_IDS,
} from "../test/helpers";
import { createCallerFactory } from "../trpc";
import { householdRouter } from "./household";

const createCaller = createCallerFactory(householdRouter);

describe("householdRouter", () => {
  const householdId = TEST_IDS.householdId;
  const userId = TEST_IDS.userId;

  describe("list", () => {
    it("returns households for authenticated user", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findMany.mockResolvedValue([
        {
          ...createTestMembership(),
          household: {
            ...createTestHousehold(),
            members: [],
            children: [],
          },
        },
      ] as never);

      const result = await caller.list();

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Test Household");
    });
  });

  describe("get", () => {
    beforeEach(() => {
      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership() as never
      );
    });

    it("returns household details", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.household.findUnique.mockResolvedValue({
        ...createTestHousehold(),
        members: [],
        children: [],
      } as never);

      const result = await caller.get({ id: householdId });

      expect(result.name).toBe("Test Household");
    });

    it("throws NOT_FOUND when household does not exist", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.household.findUnique.mockResolvedValue(null);

      await expect(caller.get({ id: householdId })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("create", () => {
    it("creates a household with creator as OWNER", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.household.create.mockResolvedValue({
        ...createTestHousehold({ name: "New Household" }),
        members: [],
      } as never);

      const result = await caller.create({ name: "New Household" });

      expect(result.name).toBe("New Household");
      expect(prismaMock.household.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "New Household",
            members: {
              create: {
                userId: TEST_IDS.userId,
                role: "OWNER",
              },
            },
          }),
        })
      );
    });
  });

  describe("update", () => {
    beforeEach(() => {
      // Mock household lookup for middleware (input.id -> household lookup)
      prismaMock.household.findUnique.mockResolvedValue(
        createTestHousehold() as never
      );
      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "OWNER" }) as never
      );
    });

    it("updates household name", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.household.update.mockResolvedValue(
        createTestHousehold({ name: "Updated Name" }) as never
      );

      const result = await caller.update({ id: householdId, name: "Updated Name" });

      expect(result.name).toBe("Updated Name");
    });

    it("throws FORBIDDEN for CAREGIVER role", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "CAREGIVER" }) as never
      );

      await expect(
        caller.update({ id: householdId, name: "New Name" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("allows ADMIN to update", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "ADMIN" }) as never
      );
      prismaMock.household.update.mockResolvedValue(
        createTestHousehold() as never
      );

      const result = await caller.update({ id: householdId, name: "New Name" });
      expect(result).toBeDefined();
    });
  });

  describe("delete", () => {
    beforeEach(() => {
      // Mock household lookup for middleware (input.id -> household lookup)
      prismaMock.household.findUnique.mockResolvedValue(
        createTestHousehold() as never
      );
    });

    it("allows OWNER to delete household", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "OWNER" }) as never
      );
      prismaMock.household.delete.mockResolvedValue(createTestHousehold() as never);

      const result = await caller.delete({ id: householdId });

      expect(result).toEqual({ success: true });
    });

    it("throws FORBIDDEN for non-OWNER", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "ADMIN" }) as never
      );

      await expect(caller.delete({ id: householdId })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });

  describe("invite", () => {
    beforeEach(() => {
      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "OWNER" }) as never
      );
    });

    it("creates an invite for new user", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.householdInvite.create.mockResolvedValue(
        createTestInvite() as never
      );

      const result = await caller.invite({
        householdId,
        email: "new@example.com",
        role: "CAREGIVER",
      });

      expect(result.email).toBe("invite@example.com");
    });

    it("throws CONFLICT when user is already a member", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.user.findUnique.mockResolvedValue({
        id: "existing-user-id",
        email: "existing@example.com",
      } as never);
      prismaMock.householdMember.findUnique
        .mockResolvedValueOnce(createTestMembership({ role: "OWNER" }) as never) // for middleware
        .mockResolvedValueOnce(createTestMembership() as never); // for existing member check

      await expect(
        caller.invite({ householdId, email: "existing@example.com" })
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });

    it("throws FORBIDDEN for CAREGIVER role", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "CAREGIVER" }) as never
      );

      await expect(
        caller.invite({ householdId, email: "test@example.com" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("acceptInvite", () => {
    it("accepts valid invite and creates membership", async () => {
      const ctx = createTestContext({
        session: createTestUser({ user: { id: TEST_IDS.userId, email: "invite@example.com" } }),
      });
      const caller = createCaller(ctx);

      prismaMock.householdInvite.findUnique.mockResolvedValue(
        createTestInvite() as never
      );
      prismaMock.$transaction.mockResolvedValue([{}, {}] as never);

      const result = await caller.acceptInvite({ token: "test-token-123" });

      expect(result.success).toBe(true);
      expect(result.householdId).toBe(TEST_IDS.householdId);
    });

    it("throws NOT_FOUND for invalid token", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdInvite.findUnique.mockResolvedValue(null);

      await expect(
        caller.acceptInvite({ token: "invalid" })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws BAD_REQUEST for expired invite", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdInvite.findUnique.mockResolvedValue(
        createTestInvite({
          expiresAt: new Date(Date.now() - 1000), // expired
        }) as never
      );

      await expect(
        caller.acceptInvite({ token: "test-token" })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("throws FORBIDDEN when email does not match", async () => {
      const ctx = createTestContext({
        session: createTestUser({ user: { id: TEST_IDS.userId, email: "wrong@example.com" } }),
      });
      const caller = createCaller(ctx);

      prismaMock.householdInvite.findUnique.mockResolvedValue(
        createTestInvite() as never
      );

      await expect(
        caller.acceptInvite({ token: "test-token" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("updateMemberRole", () => {
    it("allows OWNER to change member role", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "OWNER" }) as never
      );
      prismaMock.householdMember.update.mockResolvedValue(
        createTestMembership({ role: "ADMIN", userId: "clq1234567890abcdefghij98" }) as never
      );

      const result = await caller.updateMemberRole({
        householdId,
        userId: "clq1234567890abcdefghij98",
        role: "ADMIN",
      });

      expect(result.role).toBe("ADMIN");
    });

    it("throws FORBIDDEN for non-OWNER", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "ADMIN" }) as never
      );

      await expect(
        caller.updateMemberRole({
          householdId,
          userId: "clq1234567890abcdefghij97",
          role: "VIEWER",
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("throws BAD_REQUEST when trying to change own role", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "OWNER" }) as never
      );

      await expect(
        caller.updateMemberRole({
          householdId,
          userId, // same as session user
          role: "ADMIN",
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  describe("removeMember", () => {
    beforeEach(() => {
      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "OWNER" }) as never
      );
    });

    it("allows removing a member", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique
        .mockResolvedValueOnce(createTestMembership({ role: "OWNER" }) as never) // middleware
        .mockResolvedValueOnce(createTestMembership({ role: "CAREGIVER", userId: "clq1234567890abcdefghij97" }) as never); // member to remove
      prismaMock.householdMember.delete.mockResolvedValue({} as never);

      const result = await caller.removeMember({
        householdId,
        userId: "clq1234567890abcdefghij97",
      });

      expect(result).toEqual({ success: true });
    });

    it("allows member to remove themselves", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique
        .mockResolvedValueOnce(createTestMembership({ role: "CAREGIVER" }) as never) // middleware
        .mockResolvedValueOnce(createTestMembership({ role: "CAREGIVER" }) as never); // self
      prismaMock.householdMember.delete.mockResolvedValue({} as never);

      const result = await caller.removeMember({
        householdId,
        userId, // same as session
      });

      expect(result).toEqual({ success: true });
    });

    it("throws FORBIDDEN when removing OWNER", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const ownerUserId = "clq1234567890abcdefghij96";
      prismaMock.householdMember.findUnique
        .mockResolvedValueOnce(createTestMembership({ role: "ADMIN" }) as never)
        .mockResolvedValueOnce(createTestMembership({ role: "OWNER", userId: ownerUserId }) as never);

      await expect(
        caller.removeMember({ householdId, userId: ownerUserId })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });
});
