import { describe, expect, it } from "vitest";
import { ROUND_SETTLE_GRACE_HOURS } from "@/lib/constants";
import type { matches } from "@/lib/db/schema";
import { isRoundSettleable, roundId, toResolvedMatches } from "./lifecycle";

type MatchRow = typeof matches.$inferSelect;

const KICKOFF = new Date("2026-08-10T18:00:00Z");
const GRACE_MS = ROUND_SETTLE_GRACE_HOURS * 60 * 60 * 1000;

function match(overrides: Partial<MatchRow> = {}): MatchRow {
  return {
    id: "laliga-1",
    externalId: 1,
    competition: "laliga",
    homeTeam: "Girona",
    awayTeam: "Elx",
    homeTeamCrest: null,
    awayTeamCrest: null,
    homeScore: 2,
    awayScore: 1,
    homeScoreHt: 1,
    awayScoreHt: 1,
    matchday: 3,
    status: "finished",
    kickoff: KICKOFF,
    updatedAt: KICKOFF,
    ...overrides,
  };
}

describe("roundId", () => {
  it("keys a round by competition and matchday", () => {
    expect(roundId("laliga", 12)).toBe("laliga-12");
  });
});

describe("isRoundSettleable", () => {
  const justAfter = new Date(KICKOFF.getTime() + 2 * 60 * 60 * 1000);

  it("settles once every match is finished", () => {
    const round = [match({ id: "a" }), match({ id: "b" })];
    expect(isRoundSettleable(round, justAfter)).toBe(true);
  });

  it("treats a cancelled match as nothing left to play", () => {
    const round = [match({ id: "a" }), match({ id: "b", status: "cancelled" })];
    expect(isRoundSettleable(round, justAfter)).toBe(true);
  });

  it("waits while a match is still live", () => {
    const round = [match({ id: "a" }), match({ id: "b", status: "live" })];
    expect(isRoundSettleable(round, justAfter)).toBe(false);
  });

  it("waits on a postponed match until the grace period elapses", () => {
    const round = [match({ id: "a" }), match({ id: "b", status: "postponed" })];
    expect(isRoundSettleable(round, justAfter)).toBe(false);

    const afterGrace = new Date(KICKOFF.getTime() + GRACE_MS + 1000);
    expect(isRoundSettleable(round, afterGrace)).toBe(true);
  });

  it("measures the grace period from the last kickoff of the round", () => {
    const late = new Date(KICKOFF.getTime() + 24 * 60 * 60 * 1000);
    const round = [
      match({ id: "a" }),
      match({ id: "b", status: "postponed", kickoff: late }),
    ];

    const afterFirstGrace = new Date(KICKOFF.getTime() + GRACE_MS + 1000);
    expect(isRoundSettleable(round, afterFirstGrace)).toBe(false);

    const afterLastGrace = new Date(late.getTime() + GRACE_MS + 1000);
    expect(isRoundSettleable(round, afterLastGrace)).toBe(true);
  });

  it("never settles an empty round", () => {
    expect(isRoundSettleable([], justAfter)).toBe(false);
  });
});

describe("toResolvedMatches", () => {
  it("keeps only matches that actually produced a result", () => {
    const round = [
      match({ id: "a" }),
      match({ id: "b", status: "postponed", homeScore: null, awayScore: null }),
      match({ id: "c", status: "finished", homeScore: null, awayScore: null }),
    ];

    expect(toResolvedMatches(round).map((m) => m.id)).toEqual(["a"]);
  });

  it("carries half-time scores through", () => {
    const [resolved] = toResolvedMatches([match()]);
    expect(resolved).toMatchObject({
      id: "laliga-1",
      homeTeam: "Girona",
      awayTeam: "Elx",
      homeScore: 2,
      awayScore: 1,
      homeScoreHt: 1,
      awayScoreHt: 1,
    });
  });
});
