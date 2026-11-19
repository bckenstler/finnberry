import { describe, it, expect } from "vitest";
import { prismaMock } from "../test/setup";
import { createTestContext, createTestUser, TEST_IDS } from "../test/helpers";
import { createCallerFactory } from "../trpc";
import { adminRouter } from "./admin";

const createCaller = createCallerFactory(adminRouter);

const OTHER_USER_ID = "clq1234567890abcdefghij95";

const asAdmin = () =>
  createCaller(
    createTestContext({ session: createTestUser({ user: { isAdmin: true } }) })
  );
const asApprovedUser = () => createCaller(createTestContext());

describe("adminRouter", () => {
  describe("listUsers", () => {
    it("returns every account to the admin", async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: OTHER_USER_ID, email: "new@example.com", status: "PENDING" },
      ] as never);

      const users = await asAdmin().listUsers();

      expect(users).toHaveLength(1);
      expect(users[0]?.status).toBe("PENDING");
    });

    it("throws FORBIDDEN for an account that is not the admin", async () => {
      await expect(asApprovedUser().listUsers()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe("setUserStatus", () => {
    it("throws FORBIDDEN for an account that is not the admin", async () => {
      await expect(
        asApprovedUser().setUserStatus({ userId: OTHER_USER_ID, status: "APPROVED" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("approves a pending account without touching its sessions", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ isAdmin: false } as never);
      prismaMock.user.update.mockResolvedValue({
        id: OTHER_USER_ID,
        status: "APPROVED",
      } as never);

      const result = await asAdmin().setUserStatus({
        userId: OTHER_USER_ID,
        status: "APPROVED",
      });

      expect(result).toEqual({ id: OTHER_USER_ID, status: "APPROVED" });
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: OTHER_USER_ID },
          data: { status: "APPROVED" },
        })
      );
      expect(prismaMock.session.deleteMany).not.toHaveBeenCalled();
    });

    it("rejecting an account also ends its sessions", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ isAdmin: false } as never);
      prismaMock.$transaction.mockResolvedValue([
        { id: OTHER_USER_ID, status: "REJECTED" },
        { count: 2 },
      ] as never);

      const result = await asAdmin().setUserStatus({
        userId: OTHER_USER_ID,
        status: "REJECTED",
      });

      expect(result).toEqual({ id: OTHER_USER_ID, status: "REJECTED" });
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "REJECTED" } })
      );
      expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: OTHER_USER_ID },
      });
    });

    it("refuses to change the admin's own access", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ isAdmin: true } as never);

      await expect(
        asAdmin().setUserStatus({ userId: TEST_IDS.userId, status: "REJECTED" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
      expect(prismaMock.session.deleteMany).not.toHaveBeenCalled();
    });

    it("throws NOT_FOUND for an account that does not exist", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        asAdmin().setUserStatus({ userId: OTHER_USER_ID, status: "APPROVED" })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("does not accept PENDING as a decision", async () => {
      await expect(
        asAdmin().setUserStatus({ userId: OTHER_USER_ID, status: "PENDING" as never })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });
});
