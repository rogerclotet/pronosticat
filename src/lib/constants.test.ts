import { describe, expect, it } from "vitest";
import { calculatePointsAwarded, getOutcome } from "./constants";

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

describe("calculatePointsAwarded", () => {
  const wager = 50;

  it("awards 3x wager for exact score", () => {
    expect(calculatePointsAwarded(2, 1, 2, 1, wager)).toBe(150);
  });

  it("awards 1x wager for correct outcome only", () => {
    expect(calculatePointsAwarded(3, 0, 2, 1, wager)).toBe(50);
    expect(calculatePointsAwarded(1, 1, 0, 0, wager)).toBe(50);
  });

  it("awards 0 for wrong outcome", () => {
    expect(calculatePointsAwarded(2, 0, 0, 1, wager)).toBe(0);
    expect(calculatePointsAwarded(1, 1, 2, 1, wager)).toBe(0);
  });
});
