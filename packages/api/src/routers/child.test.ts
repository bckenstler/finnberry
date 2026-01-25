import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../test/setup";
import {
  createTestContext,
  createTestMembership,
  createTestChild,
  createTestHousehold,
  TEST_IDS,
} from "../test/helpers";
import { createCallerFactory } from "../trpc";
import { childRouter } from "./child";

const createCaller = createCallerFactory(childRouter);

describe("childRouter", () => {
  const householdId = TEST_IDS.householdId;
  const childId = TEST_IDS.childId;

  beforeEach(() => {
    prismaMock.householdMember.findUnique.mockResolvedValue(
      createTestMembership({ role: "CAREGIVER" }) as never
    );
    prismaMock.child.findUnique.mockResolvedValue(createTestChild() as never);
  });

  describe("list", () => {
    it("returns children for household", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const children = [createTestChild(), createTestChild({ id: "clq1234567890abcdefghij15", name: "Baby 2" })];
      prismaMock.child.findMany.mockResolvedValue(children as never);

      const result = await caller.list({ householdId });

      expect(result).toHaveLength(2);
      expect(prismaMock.child.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { householdId },
          orderBy: { birthDate: "desc" },
        })
      );
    });
  });

  describe("get", () => {
    it("returns child details", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.child.findUnique.mockResolvedValue({
        ...createTestChild(),
        household: { id: householdId, name: "Test Household" },
      } as never);

      const result = await caller.get({ id: childId });

      expect(result.name).toBe("Test Baby");
      expect(result.household).toBeDefined();
    });

    it("throws NOT_FOUND when child does not exist", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      // First call for middleware, second for actual query
      prismaMock.child.findUnique
        .mockResolvedValueOnce(createTestChild() as never)
        .mockResolvedValueOnce(null);

      await expect(caller.get({ id: childId })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("create", () => {
    it("creates a child", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      const newChild = createTestChild({
        name: "New Baby",
        birthDate: new Date("2024-06-01"),
        gender: "FEMALE",
      });
      prismaMock.child.create.mockResolvedValue(newChild as never);

      const result = await caller.create({
        householdId,
        name: "New Baby",
        birthDate: new Date("2024-06-01"),
        gender: "FEMALE",
      });

      expect(result.name).toBe("New Baby");
      expect(result.gender).toBe("FEMALE");
    });

    it("throws FORBIDDEN for VIEWER role", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "VIEWER" }) as never
      );

      await expect(
        caller.create({
          householdId,
          name: "New Baby",
          birthDate: new Date(),
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("update", () => {
    it("updates child information", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.child.update.mockResolvedValue(
        createTestChild({ name: "Updated Name" }) as never
      );

      const result = await caller.update({ id: childId, name: "Updated Name" });

      expect(result.name).toBe("Updated Name");
    });

    it("throws FORBIDDEN for VIEWER role", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "VIEWER" }) as never
      );

      await expect(
        caller.update({ id: childId, name: "New Name" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("delete", () => {
    it("allows OWNER to delete child", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "OWNER" }) as never
      );
      prismaMock.child.delete.mockResolvedValue(createTestChild() as never);

      const result = await caller.delete({ id: childId });

      expect(result).toEqual({ success: true });
    });

    it("allows ADMIN to delete child", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "ADMIN" }) as never
      );
      prismaMock.child.delete.mockResolvedValue(createTestChild() as never);

      const result = await caller.delete({ id: childId });

      expect(result).toEqual({ success: true });
    });

    it("throws FORBIDDEN for CAREGIVER role", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      await expect(caller.delete({ id: childId })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("throws FORBIDDEN for VIEWER role", async () => {
      const ctx = createTestContext();
      const caller = createCaller(ctx);

      prismaMock.householdMember.findUnique.mockResolvedValue(
        createTestMembership({ role: "VIEWER" }) as never
      );

      await expect(caller.delete({ id: childId })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });
});
