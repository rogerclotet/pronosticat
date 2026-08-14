import { describe, expect, it } from "vitest";
import { roundHitStreak, streakBroke } from "./streak";

describe("roundHitStreak", () => {
  it("counts consecutive hits from the newest round", () => {
    expect(roundHitStreak([{ hits: 2 }, { hits: 1 }, { hits: 0 }])).toBe(2);
  });

  it("is zero when the latest round missed", () => {
    expect(roundHitStreak([{ hits: 0 }, { hits: 4 }])).toBe(0);
  });
});

describe("streakBroke", () => {
  it("fires after a 3+ run ends on a blank round", () => {
    expect(
      streakBroke({ hitsThisRound: 0, previousStreak: 3, minStreak: 3 }),
    ).toBe(true);
  });

  it("ignores a miss with no real streak behind it", () => {
    expect(
      streakBroke({ hitsThisRound: 0, previousStreak: 2, minStreak: 3 }),
    ).toBe(false);
  });
});
