import { describe, expect, it } from "vitest";
import { blank } from "@/lib/challenges/definitions/blank";
import { btts } from "@/lib/challenges/definitions/btts";
import { choke } from "@/lib/challenges/definitions/choke";
import { cleanSheet } from "@/lib/challenges/definitions/clean-sheet";
import { comeback } from "@/lib/challenges/definitions/comeback";
import { drawPick } from "@/lib/challenges/definitions/draw-pick";
import { homeWins } from "@/lib/challenges/definitions/home-wins";
import { theBore } from "@/lib/challenges/definitions/the-bore";
import { totalGoalsRound } from "@/lib/challenges/definitions/total-goals";
import { upset } from "@/lib/challenges/definitions/upset";
import type { EntryTarget, ResolvedMatch } from "@/lib/challenges/types";

function match(
  id: string,
  homeScore: number,
  awayScore: number,
  ht?: [number, number],
): ResolvedMatch {
  return {
    id,
    homeTeam: `${id} home`,
    awayTeam: `${id} away`,
    homeScore,
    awayScore,
    homeScoreHt: ht?.[0] ?? null,
    awayScoreHt: ht?.[1] ?? null,
  };
}

function target(overrides: Partial<EntryTarget>): EntryTarget {
  return {
    matchId: null,
    side: null,
    predictedHome: null,
    predictedAway: null,
    numericValue: null,
    ...overrides,
  };
}

/** a: 4 goals · b: 4 goals · c: 1 goal */
const round = [match("a", 3, 1), match("b", 4, 0), match("c", 0, 1)];

describe("theBore", () => {
  it("rewards the quietest match", () => {
    expect(theBore.score(target({ matchId: "c" }), round)).toBe(80);
  });

  it("penalises a high-scoring match", () => {
    expect(theBore.score(target({ matchId: "b" }), round)).toBe(-20);
  });
});

describe("upset", () => {
  it("rewards a winning away team", () => {
    expect(upset.score(target({ matchId: "c", side: "away" }), round)).toBe(70);
  });

  it("penalises a home pick", () => {
    expect(upset.score(target({ matchId: "a", side: "home" }), round)).toBe(-20);
  });
});

describe("cleanSheet", () => {
  it("rewards a team that concedes zero", () => {
    expect(cleanSheet.score(target({ matchId: "b", side: "home" }), round)).toBe(
      60,
    );
  });
});

describe("blank", () => {
  it("rewards a team that fails to score", () => {
    expect(blank.score(target({ matchId: "c", side: "home" }), round)).toBe(60);
  });
});

describe("choke", () => {
  it("rewards a losing team", () => {
    expect(choke.score(target({ matchId: "c", side: "home" }), round)).toBe(50);
  });
});

describe("drawPick", () => {
  it("rewards a drawn match", () => {
    const drawn = [...round, match("d", 2, 2)];
    expect(drawPick.score(target({ matchId: "d" }), drawn)).toBe(60);
  });
});

describe("btts", () => {
  it("rewards a match where both teams score", () => {
    expect(btts.score(target({ matchId: "a" }), round)).toBe(40);
  });

  it("penalises a clean sheet match", () => {
    expect(btts.score(target({ matchId: "b" }), round)).toBe(-20);
  });
});

describe("comeback", () => {
  it("rewards a side that was losing at half-time but did not lose", () => {
    const remuntada = [match("x", 2, 2, [0, 1])];
    expect(comeback.score(target({ matchId: "x" }), remuntada)).toBe(90);
  });

  it("voids when half-time scores are missing", () => {
    expect(comeback.score(target({ matchId: "a" }), round)).toBeNull();
  });
});

describe("totalGoalsRound", () => {
  it("uses tiered scoring for the round total", () => {
    expect(totalGoalsRound.score(target({ numericValue: 9 }), round)).toBe(100);
    expect(totalGoalsRound.score(target({ numericValue: 8 }), round)).toBe(50);
    expect(totalGoalsRound.score(target({ numericValue: 5 }), round)).toBe(-20);
  });
});

describe("homeWins", () => {
  it("counts home wins in the round", () => {
    expect(homeWins.score(target({ numericValue: 2 }), round)).toBe(100);
    expect(homeWins.score(target({ numericValue: 1 }), round)).toBe(50);
  });
});
