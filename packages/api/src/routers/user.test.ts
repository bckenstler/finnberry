import { describe, it, expect } from "vitest";
import { prismaMock } from "../test/setup";
import { createTestContext, createTestMembership, TEST_IDS } from "../test/helpers";
import { createCallerFactory } from "../trpc";
import { userRouter } from "./user";

const createCaller = createCallerFactory(userRouter);

describe("userRouter", () => {
  const userId = TEST_IDS.userId;

  describe("get", () => {
    it("returns current user profile", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.user.findUnique.mockResolvedValue({
        id: userId,
        name: "Test User",
        email: "test@example.com",
        image: null,
        createdAt: new Date(),
      } as never);

      const result = await caller.get();

      expect(result.id).toBe(userId);
      expect(result.name).toBe("Test User");
      expect(result.email).toBe("test@example.com");
    });

    it("throws NOT_FOUND when user does not exist", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(caller.get()).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("update", () => {
    it("updates user name", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.user.update.mockResolvedValue({
        id: userId,
        name: "New Name",
        email: "test@example.com",
        image: null,
      } as never);

      const result = await caller.update({ name: "New Name" });

      expect(result.name).toBe("New Name");
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: { name: "New Name" },
        })
      );
    });
  });

  describe("delete", () => {
    it("throws BAD_REQUEST when email confirmation does not match", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      await expect(
        caller.delete({ confirmEmail: "wrong@example.com" })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Email confirmation does not match your account email",
      });
    });

    it("deletes user and transfers household ownership", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const otherMember = {
        id: "other-member-id",
        householdId: TEST_IDS.householdId,
        userId: "other-user-id",
        role: "ADMIN" as const,
        createdAt: new Date(),
      };

      prismaMock.householdMember.findMany.mockResolvedValue([
        {
          ...createTestMembership({ role: "OWNER" }),
          household: {
            id: TEST_IDS.householdId,
            name: "Test Household",
            members: [createTestMembership({ role: "OWNER" }), otherMember],
          },
        },
      ] as never);

      prismaMock.householdMember.update.mockResolvedValue(otherMember as never);
      prismaMock.user.delete.mockResolvedValue({ id: userId } as never);

      const result = await caller.delete({ confirmEmail: "test@example.com" });

      expect(result.success).toBe(true);
      expect(prismaMock.householdMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            householdId_userId: {
              householdId: TEST_IDS.householdId,
              userId: "other-user-id",
            },
          },
          data: { role: "OWNER" },
        })
      );
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it("deletes household when user is sole owner", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findMany.mockResolvedValue([
        {
          ...createTestMembership({ role: "OWNER" }),
          household: {
            id: TEST_IDS.householdId,
            name: "Test Household",
            members: [createTestMembership({ role: "OWNER" })],
          },
        },
      ] as never);

      prismaMock.household.delete.mockResolvedValue({
        id: TEST_IDS.householdId,
      } as never);
      prismaMock.user.delete.mockResolvedValue({ id: userId } as never);

      const result = await caller.delete({ confirmEmail: "test@example.com" });

      expect(result.success).toBe(true);
      expect(prismaMock.household.delete).toHaveBeenCalledWith({
        where: { id: TEST_IDS.householdId },
      });
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });
});
