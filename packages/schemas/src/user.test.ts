import { describe, it, expect } from "vitest";
import { updateUserSchema, deleteUserSchema } from "./user";

describe("updateUserSchema", () => {
  it("accepts valid name", () => {
    const result = updateUserSchema.parse({ name: "John Doe" });
    expect(result.name).toBe("John Doe");
  });

  it("accepts empty object", () => {
    const result = updateUserSchema.parse({});
    expect(result).toEqual({});
  });

  it("rejects empty name", () => {
    expect(() => updateUserSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name over 100 characters", () => {
    expect(() => updateUserSchema.parse({ name: "a".repeat(101) })).toThrow();
  });
});

describe("deleteUserSchema", () => {
  it("requires confirmEmail", () => {
    expect(() => deleteUserSchema.parse({})).toThrow();
  });

  it("accepts valid email", () => {
    const result = deleteUserSchema.parse({ confirmEmail: "test@example.com" });
    expect(result.confirmEmail).toBe("test@example.com");
  });

  it("rejects invalid email", () => {
    expect(() => deleteUserSchema.parse({ confirmEmail: "invalid" })).toThrow();
  });

  it("rejects empty email", () => {
    expect(() => deleteUserSchema.parse({ confirmEmail: "" })).toThrow();
  });
});
