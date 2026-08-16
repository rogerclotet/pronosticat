import { describe, expect, it } from "vitest";
import { banker } from "@/lib/challenges/definitions/banker";
import { exactScore } from "@/lib/challenges/definitions/exact-score";
import { goalFest } from "@/lib/challenges/definitions/goal-fest";
import { goalMachine } from "@/lib/challenges/definitions/goal-machine";
import { thrashing } from "@/lib/challenges/definitions/thrashing";
import type { EntryTarget, ResolvedMatch } from "@/lib/challenges/types";

function match(
  id: string,
  homeScore: number,
  awayScore: number,
): ResolvedMatch {
  return {
    id,
    homeTeam: `${id} home`,
    awayTeam: `${id} away`,
    homeScore,
    awayScore,
    homeScoreHt: null,
    awayScoreHt: null,
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

/** a: 4 goals, diff 2 · b: 4 goals, diff 4 · c: 1 goal, diff 1 */
const round = [match("a", 3, 1), match("b", 4, 0), match("c", 0, 1)];

describe("exactScore", () => {
  it("pays the full reward for the exact scoreline", () => {
    const pick = target({ matchId: "a", predictedHome: 3, predictedAway: 1 });
    expect(exactScore.score(pick, round)).toBe(100);
  });

  it("pays a consolation for the right outcome only", () => {
    const pick = target({ matchId: "a", predictedHome: 2, predictedAway: 0 });
    expect(exactScore.score(pick, round)).toBe(25);
  });

  it("penalises the wrong outcome", () => {
    const pick = target({ matchId: "a", predictedHome: 0, predictedAway: 2 });
    expect(exactScore.score(pick, round)).toBe(-25);
  });

  it("matches draws by outcome", () => {
    const pick = target({ matchId: "d", predictedHome: 2, predictedAway: 2 });
    expect(exactScore.score(pick, [...round, match("d", 1, 1)])).toBe(25);
  });

  it("voids a pick whose match was not played", () => {
    const pick = target({ matchId: "zz", predictedHome: 1, predictedAway: 0 });
    expect(exactScore.score(pick, round)).toBeNull();
  });

  it("voids a pick with no scoreline", () => {
    expect(exactScore.score(target({ matchId: "a" }), round)).toBeNull();
  });
});

describe("goalFest", () => {
  it("pays the base tier for a match that clears four goals", () => {
    expect(goalFest.score(target({ matchId: "a" }), round)).toBe(50);
  });

  it("pays the top tier for six goals or more", () => {
    const shootout = [...round, match("d", 4, 2)];
    expect(goalFest.score(target({ matchId: "d" }), shootout)).toBe(100);
  });

  it("pays a match that clears the bar even when a louder one exists", () => {
    const louder = [match("a", 3, 1), match("b", 5, 2)];
    expect(goalFest.score(target({ matchId: "a" }), louder)).toBe(50);
  });

  it("scores nothing below the bar", () => {
    expect(goalFest.score(target({ matchId: "c" }), round)).toBe(0);
  });

  it("voids an unplayed target", () => {
    expect(goalFest.score(target({ matchId: "zz" }), round)).toBeNull();
  });
});

describe("thrashing", () => {
  it("pays the base tier for a two-goal win", () => {
    expect(thrashing.score(target({ matchId: "a" }), round)).toBe(35);
  });

  it("pays the top tier for a four-goal win", () => {
    expect(thrashing.score(target({ matchId: "b" }), round)).toBe(100);
  });

  it("scores nothing for a one-goal win", () => {
    expect(thrashing.score(target({ matchId: "c" }), round)).toBe(0);
  });

  it("counts an away thrashing the same as a home one", () => {
    const lopsided = [match("a", 1, 1), match("b", 0, 5)];
    expect(thrashing.score(target({ matchId: "b" }), lopsided)).toBe(100);
  });

  it("pays a two-goal win even when a bigger rout exists", () => {
    expect(
      thrashing.score(target({ matchId: "a" }), [...round, match("d", 6, 0)]),
    ).toBe(35);
  });
});

describe("goalMachine", () => {
  it("pays the base tier for a team that scores three", () => {
    const pick = target({ matchId: "a", side: "home" });
    expect(goalMachine.score(pick, round)).toBe(70);
  });

  it("pays the top tier for five goals or more", () => {
    const rout = [match("a", 5, 0)];
    expect(
      goalMachine.score(target({ matchId: "a", side: "home" }), rout),
    ).toBe(140);
  });

  it("scores nothing for a team below the bar", () => {
    const pick = target({ matchId: "c", side: "away" });
    expect(goalMachine.score(pick, round)).toBe(0);
  });

  it("pays a team that clears the bar even when another scored more", () => {
    const tally = [match("a", 3, 0), match("b", 6, 0)];
    expect(
      goalMachine.score(target({ matchId: "a", side: "home" }), tally),
    ).toBe(70);
  });

  it("voids a team pick with no side", () => {
    expect(goalMachine.score(target({ matchId: "b" }), round)).toBeNull();
  });
});

describe("banker", () => {
  it("rewards a winning team", () => {
    expect(banker.score(target({ matchId: "a", side: "home" }), round)).toBe(
      40,
    );
  });

  it("penalises a losing team", () => {
    expect(banker.score(target({ matchId: "a", side: "away" }), round)).toBe(
      -40,
    );
  });

  it("penalises a draw as heavily as a loss", () => {
    const drawn = [match("a", 1, 1)];
    expect(banker.score(target({ matchId: "a", side: "home" }), drawn)).toBe(
      -40,
    );
  });

  it("reads an away win from the away side", () => {
    expect(banker.score(target({ matchId: "c", side: "away" }), round)).toBe(
      40,
    );
  });
});
