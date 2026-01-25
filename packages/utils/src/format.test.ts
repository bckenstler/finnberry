import { describe, it, expect } from "vitest";
import {
  formatMl,
  formatWeight,
  formatHeight,
  capitalize,
  pluralize,
} from "./format";

describe("formatMl", () => {
  it("formats milliliters under 1000", () => {
    expect(formatMl(100)).toBe("100ml");
    expect(formatMl(500)).toBe("500ml");
    expect(formatMl(999)).toBe("999ml");
  });

  it("converts to liters for 1000ml or more", () => {
    expect(formatMl(1000)).toBe("1.0L");
    expect(formatMl(1500)).toBe("1.5L");
    expect(formatMl(2500)).toBe("2.5L");
  });

  it("handles zero", () => {
    expect(formatMl(0)).toBe("0ml");
  });
});

describe("formatWeight", () => {
  it("formats grams for weights under 1kg", () => {
    expect(formatWeight(0.5)).toBe("500g");
    expect(formatWeight(0.1)).toBe("100g");
    expect(formatWeight(0.999)).toBe("999g");
  });

  it("formats kilograms for weights 1kg or more", () => {
    expect(formatWeight(1)).toBe("1.00kg");
    expect(formatWeight(3.5)).toBe("3.50kg");
    expect(formatWeight(10.25)).toBe("10.25kg");
  });

  it("handles zero", () => {
    expect(formatWeight(0)).toBe("0g");
  });
});

describe("formatHeight", () => {
  it("formats centimeters with one decimal", () => {
    expect(formatHeight(50)).toBe("50.0cm");
    expect(formatHeight(75.5)).toBe("75.5cm");
    expect(formatHeight(100.25)).toBe("100.3cm"); // rounds
  });

  it("handles zero", () => {
    expect(formatHeight(0)).toBe("0.0cm");
  });
});

describe("capitalize", () => {
  it("capitalizes first letter", () => {
    expect(capitalize("hello")).toBe("Hello");
  });

  it("lowercases rest of string", () => {
    expect(capitalize("HELLO")).toBe("Hello");
    expect(capitalize("hELLO")).toBe("Hello");
  });

  it("handles single character", () => {
    expect(capitalize("a")).toBe("A");
  });

  it("handles empty string", () => {
    expect(capitalize("")).toBe("");
  });
});

describe("pluralize", () => {
  it("returns singular for count of 1", () => {
    expect(pluralize(1, "apple")).toBe("apple");
    expect(pluralize(1, "child", "children")).toBe("child");
  });

  it("returns plural for count other than 1", () => {
    expect(pluralize(0, "apple")).toBe("apples");
    expect(pluralize(2, "apple")).toBe("apples");
    expect(pluralize(10, "apple")).toBe("apples");
  });

  it("uses custom plural form when provided", () => {
    expect(pluralize(2, "child", "children")).toBe("children");
    expect(pluralize(0, "mouse", "mice")).toBe("mice");
  });

  it("handles negative numbers", () => {
    expect(pluralize(-1, "apple")).toBe("apples");
    expect(pluralize(-5, "apple")).toBe("apples");
  });
});
