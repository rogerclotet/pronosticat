import { describe, expect, it } from "vitest";
import { type PickSnapshot, samePicks } from "./same-picks";

function pick(overrides: Partial<PickSnapshot> = {}): PickSnapshot {
  return {
    roundChallengeId: "slot-1",
    targetMatchId: "match-1",
    targetSide: "home",
    predictedHome: null,
    predictedAway: null,
    numericValue: null,
    targetsJson: null,
    isJoker: false,
    ...overrides,
  };
}

describe("samePicks", () => {
  it("treats two empty boards as the same", () => {
    expect(samePicks([], [])).toBe(true);
  });

  it("treats identical picks as the same regardless of order", () => {
    const a = [
      pick({ roundChallengeId: "slot-1", targetMatchId: "m1" }),
      pick({ roundChallengeId: "slot-2", targetMatchId: "m2", isJoker: true }),
    ];
    const b = [
      pick({ roundChallengeId: "slot-2", targetMatchId: "m2", isJoker: true }),
      pick({ roundChallengeId: "slot-1", targetMatchId: "m1" }),
    ];
    expect(samePicks(a, b)).toBe(true);
  });

  it("treats a different target as different", () => {
    expect(
      samePicks(
        [pick({ targetMatchId: "m1" })],
        [pick({ targetMatchId: "m2" })],
      ),
    ).toBe(false);
  });

  it("treats a different joker as different", () => {
    expect(
      samePicks([pick({ isJoker: true })], [pick({ isJoker: false })]),
    ).toBe(false);
  });

  it("treats a different scoreline as different", () => {
    expect(
      samePicks(
        [pick({ predictedHome: 2, predictedAway: 1 })],
        [pick({ predictedHome: 1, predictedAway: 1 })],
      ),
    ).toBe(false);
  });

  it("treats a missing slot as different", () => {
    expect(
      samePicks(
        [pick({ roundChallengeId: "slot-1" })],
        [
          pick({ roundChallengeId: "slot-1" }),
          pick({ roundChallengeId: "slot-2", targetMatchId: "m2" }),
        ],
      ),
    ).toBe(false);
  });
});
