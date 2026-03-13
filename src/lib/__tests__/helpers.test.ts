import { describe, it, expect } from "vitest";
import { p, fmt, uid, toXOF } from "../helpers";

describe("p() — parse number", () => {
  it("parses integer strings", () => {
    expect(p("1000")).toBe(1000);
  });
  it("parses French-format numbers with spaces", () => {
    expect(p("1 500 000")).toBe(1500000);
  });
  it("parses comma-decimal numbers", () => {
    expect(p("1500,50")).toBe(1500.5);
  });
  it("returns 0 for empty/null/undefined", () => {
    expect(p("")).toBe(0);
    expect(p(null)).toBe(0);
    expect(p(undefined)).toBe(0);
  });
  it("returns 0 for non-numeric strings", () => {
    expect(p("abc")).toBe(0);
  });
});

describe("fmt() — format number", () => {
  it("returns — for 0", () => {
    expect(fmt(0)).toBe("—");
  });
  it("formats with French locale separators", () => {
    const result = fmt(1500000);
    // Should contain the digits without decimals
    expect(result.replace(/\s/g, "")).toContain("1500000");
  });
  it("rounds to integer", () => {
    expect(fmt(1000.7).replace(/\s/g, "")).toContain("1001");
  });
});

describe("uid() — UUID generation", () => {
  it("returns a string", () => {
    expect(typeof uid()).toBe("string");
  });
  it("returns valid UUID v4 format", () => {
    const id = uid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it("generates unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});

describe("toXOF() — currency conversion", () => {
  const fx = { XOF: 1, EUR: 655.957, USD: 610 };

  it("returns same value for XOF", () => {
    expect(toXOF(1000, "XOF", fx)).toBe(1000);
  });
  it("converts EUR to XOF", () => {
    expect(toXOF(100, "EUR", fx)).toBeCloseTo(65595.7, 0);
  });
  it("converts USD to XOF", () => {
    expect(toXOF(100, "USD", fx)).toBe(61000);
  });
  it("returns original value for unknown currency", () => {
    expect(toXOF(100, "ZZZ", fx)).toBe(100);
  });
});
