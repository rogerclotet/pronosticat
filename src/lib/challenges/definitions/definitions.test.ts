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
  it("rewards the highest-scoring match", () => {
    expect(goalFest.score(target({ matchId: "b" }), round)).toBe(80);
  });

  it("rewards every match tied on goals", () => {
    expect(goalFest.score(target({ matchId: "a" }), round)).toBe(80);
  });

  it("scores nothing for a quieter match", () => {
    expect(goalFest.score(target({ matchId: "c" }), round)).toBe(0);
  });

  it("voids an unplayed target", () => {
    expect(goalFest.score(target({ matchId: "zz" }), round)).toBeNull();
  });
});

describe("thrashing", () => {
  it("rewards the biggest goal difference", () => {
    expect(thrashing.score(target({ matchId: "b" }), round)).toBe(80);
  });

  it("scores nothing for a tighter match", () => {
    expect(thrashing.score(target({ matchId: "a" }), round)).toBe(0);
  });

  it("counts an away thrashing the same as a home one", () => {
    const lopsided = [match("a", 1, 1), match("b", 0, 5)];
    expect(thrashing.score(target({ matchId: "b" }), lopsided)).toBe(80);
  });

  it("rewards every match tied on difference", () => {
    const tied = [match("a", 2, 0), match("b", 0, 2)];
    expect(thrashing.score(target({ matchId: "a" }), tied)).toBe(80);
    expect(thrashing.score(target({ matchId: "b" }), tied)).toBe(80);
  });
});

describe("goalMachine", () => {
  it("rewards the top-scoring team", () => {
    const pick = target({ matchId: "b", side: "home" });
    expect(goalMachine.score(pick, round)).toBe(80);
  });

  it("scores nothing for a team that scored less", () => {
    const pick = target({ matchId: "a", side: "home" });
    expect(goalMachine.score(pick, round)).toBe(0);
  });

  it("rewards every team tied on goals", () => {
    const tied = [match("a", 3, 0), match("b", 0, 3)];
    expect(
      goalMachine.score(target({ matchId: "a", side: "home" }), tied),
    ).toBe(80);
    expect(
      goalMachine.score(target({ matchId: "b", side: "away" }), tied),
    ).toBe(80);
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
