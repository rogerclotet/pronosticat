import { describe, expect, it } from "vitest";
import { getOutcome } from "./constants";

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
