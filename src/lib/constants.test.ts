import { describe, expect, it } from "vitest";
import { generateInviteCode, getOutcome } from "./constants";

describe("getOutcome", () => {
  it("returns home win", () => {
    expect(getOutcome(2, 1)).toBe("home");
  });

  it("returns away win", () => {
    expect(getOutcome(0, 1)).toBe("away");
  });

  it("returns draw", () => {
    expect(getOutcome(1, 1)).toBe("draw");
  });
});

describe("generateInviteCode", () => {
  it("returns 8 characters from the unambiguous alphabet", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });

  it("does not emit the same code twice in a short sample", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateInviteCode()));
    expect(codes.size).toBe(50);
  });
});
