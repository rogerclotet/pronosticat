import { describe, expect, it } from "vitest";
import { type ScorableEntry, scoreEntry } from "@/lib/challenges/score";
import type { ResolvedMatch } from "@/lib/challenges/types";

const round: ResolvedMatch[] = [
  {
    id: "a",
    homeTeam: "Girona",
    awayTeam: "Elx",
    homeScore: 3,
    awayScore: 1,
    homeScoreHt: null,
    awayScoreHt: null,
  },
];

function entry(overrides: Partial<ScorableEntry>): ScorableEntry {
  return {
    matchId: "a",
    side: null,
    predictedHome: null,
    predictedAway: null,
    numericValue: null,
    isJoker: false,
    ...overrides,
  };
}

describe("scoreEntry", () => {
  it("doubles a reward when the joker is attached", () => {
    const pick = entry({ side: "home", isJoker: true });
    expect(scoreEntry("banker", pick, round)).toBe(80);
  });

  it("doubles a penalty just as hard", () => {
    const pick = entry({ side: "away", isJoker: true });
    expect(scoreEntry("banker", pick, round)).toBe(-80);
  });

  it("leaves a plain pick untouched", () => {
    expect(scoreEntry("banker", entry({ side: "home" }), round)).toBe(40);
  });

  it("voids every pick in an empty round", () => {
    expect(scoreEntry("banker", entry({ side: "home" }), [])).toBeNull();
  });

  it("voids an unknown challenge", () => {
    expect(
      scoreEntry("nonexistent", entry({ side: "home" }), round),
    ).toBeNull();
  });

  it("does not double a void pick into a number", () => {
    const pick = entry({ matchId: "zz", side: "home", isJoker: true });
    expect(scoreEntry("banker", pick, round)).toBeNull();
  });
});
