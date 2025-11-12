import { describe, it, expect } from "vitest";
import { normalizeAge, parseIntOrNull, parseFloatOrNull } from "../form";

describe("form utils", () => {
  it("parseIntOrNull parses valid int", () => {
    expect(parseIntOrNull("12")).toBe(12);
  });
  it("parseIntOrNull returns null on invalid", () => {
    expect(parseIntOrNull("abc")).toBeNull();
  });
  it("parseFloatOrNull parses valid float", () => {
    expect(parseFloatOrNull("3.5")).toBe(3.5);
  });
  it("normalizeAge returns error if under 2 years", () => {
    const res = normalizeAge(1);
    expect(res.error).toMatch(/at least 2 years/);
  });
  it("normalizeAge returns error if over 7 years", () => {
    const res = normalizeAge(8);
    expect(res.error).toMatch(/not exceed 7 years/);
  });
  it("normalizeAge returns age_years when valid", () => {
    const res = normalizeAge(3);
    expect(res.age_years).toBe(3);
  });
  it("normalizeAge falls back to legacy float string", () => {
    const res = normalizeAge(undefined, "4.9");
    expect(res.age_years).toBe(4);
  });
});
