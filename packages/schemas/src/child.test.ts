import { describe, it, expect } from "vitest";
import {
  genderSchema,
  createChildSchema,
  updateChildSchema,
  deleteChildSchema,
  getChildSchema,
  listChildrenSchema,
} from "./child";

const validHouseholdId = "cljk2j3k40000a1b2c3d4e5f6";
const validChildId = "cljk2j3k40001a1b2c3d4e5f7";

describe("genderSchema", () => {
  it("accepts valid genders", () => {
    expect(genderSchema.parse("MALE")).toBe("MALE");
    expect(genderSchema.parse("FEMALE")).toBe("FEMALE");
    expect(genderSchema.parse("OTHER")).toBe("OTHER");
  });

  it("rejects invalid genders", () => {
    expect(() => genderSchema.parse("UNKNOWN")).toThrow();
    expect(() => genderSchema.parse("male")).toThrow();
  });
});

describe("createChildSchema", () => {
  it("requires householdId, name, and birthDate", () => {
    expect(() =>
      createChildSchema.parse({
        householdId: validHouseholdId,
        name: "Baby",
      })
    ).toThrow();
  });

  it("accepts minimal input", () => {
    const result = createChildSchema.parse({
      householdId: validHouseholdId,
      name: "Baby Emma",
      birthDate: new Date("2024-01-01"),
    });
    expect(result.name).toBe("Baby Emma");
  });

  it("coerces date string", () => {
    const result = createChildSchema.parse({
      householdId: validHouseholdId,
      name: "Baby Emma",
      birthDate: "2024-01-01",
    });
    expect(result.birthDate).toBeInstanceOf(Date);
  });

  it("accepts optional gender", () => {
    const result = createChildSchema.parse({
      householdId: validHouseholdId,
      name: "Baby",
      birthDate: new Date(),
      gender: "FEMALE",
    });
    expect(result.gender).toBe("FEMALE");
  });

  it("accepts optional photo URL", () => {
    const result = createChildSchema.parse({
      householdId: validHouseholdId,
      name: "Baby",
      birthDate: new Date(),
      photo: "https://example.com/photo.jpg",
    });
    expect(result.photo).toBe("https://example.com/photo.jpg");
  });

  it("validates photo URL format", () => {
    expect(() =>
      createChildSchema.parse({
        householdId: validHouseholdId,
        name: "Baby",
        birthDate: new Date(),
        photo: "not-a-url",
      })
    ).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      createChildSchema.parse({
        householdId: validHouseholdId,
        name: "",
        birthDate: new Date(),
      })
    ).toThrow();
  });

  it("rejects name over 100 characters", () => {
    expect(() =>
      createChildSchema.parse({
        householdId: validHouseholdId,
        name: "a".repeat(101),
        birthDate: new Date(),
      })
    ).toThrow();
  });
});

describe("updateChildSchema", () => {
  it("requires id", () => {
    expect(() => updateChildSchema.parse({})).toThrow();
  });

  it("accepts id only", () => {
    const result = updateChildSchema.parse({ id: validChildId });
    expect(result.id).toBe(validChildId);
  });

  it("accepts partial updates", () => {
    const result = updateChildSchema.parse({
      id: validChildId,
      name: "New Name",
    });
    expect(result.name).toBe("New Name");
  });

  it("accepts nullable optional fields", () => {
    const result = updateChildSchema.parse({
      id: validChildId,
      gender: null,
      photo: null,
    });
    expect(result.gender).toBeNull();
    expect(result.photo).toBeNull();
  });
});

describe("deleteChildSchema", () => {
  it("requires valid id", () => {
    const result = deleteChildSchema.parse({ id: validChildId });
    expect(result.id).toBe(validChildId);
  });
});

describe("getChildSchema", () => {
  it("requires valid id", () => {
    const result = getChildSchema.parse({ id: validChildId });
    expect(result.id).toBe(validChildId);
  });
});

describe("listChildrenSchema", () => {
  it("requires householdId", () => {
    expect(() => listChildrenSchema.parse({})).toThrow();
  });

  it("accepts valid householdId", () => {
    const result = listChildrenSchema.parse({ householdId: validHouseholdId });
    expect(result.householdId).toBe(validHouseholdId);
  });
});
