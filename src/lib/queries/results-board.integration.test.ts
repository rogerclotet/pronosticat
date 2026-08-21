import { beforeEach, describe, expect, it, vi } from "vitest";

// `getRoundMatches` wraps its read in Next's `unstable_cache`, which needs a
// request context this suite has no reason to fake: read the rows straight
// from the database instead.
vi.mock("@/lib/queries/matches", async () => {
  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("@/lib/db");
  const { matches } = await import("@/lib/db/schema");

  return {
    getRoundMatches: (competition: string, season: number, matchday: number) =>
      db.query.matches.findMany({
        where: and(
          eq(matches.competition, competition as "laliga"),
          eq(matches.season, season),
          eq(matches.matchday, matchday),
        ),
        orderBy: [matches.kickoff],
      }),
  };
});

/**
 * Which round the results screen opens on, against a real Postgres. Opt in
 * with RUN_DB_TESTS=1 and a DATABASE_URL pointing at a throwaway database —
 * this truncates every app table it touches. See
 * `src/lib/rounds/settlement.integration.test.ts` for the setup recipe.
 */
const enabled = process.env.RUN_DB_TESTS === "1" && !!process.env.DATABASE_URL;

describe.skipIf(!enabled)("results round board against Postgres", async () => {
  const { sql } = await import("drizzle-orm");
  const { db } = await import("@/lib/db");
  const schema = await import("@/lib/db/schema");
  const { ensureRounds } = await import("@/lib/rounds/ensure");
  const { getResultsRoundBoard } = await import("@/lib/queries/round-board");
  const { generateId } = await import("@/lib/constants");

  const USER_ID = "u-test";
  const GROUP_ID = "g-test";
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const SEASON = 2026;
  const roundIdFor = (matchday: number) => `laliga-${SEASON}-${matchday}`;

  type MatchSeed = {
    matchday: number;
    kickoff: Date;
    status: "scheduled" | "finished";
  };

  async function reset() {
    await db.execute(
      sql`truncate table entries, round_challenges, rounds, matches, group_members, groups, "user" cascade`,
    );
    await db.insert(schema.user).values({
      id: USER_ID,
      name: "Test",
      email: "test@example.com",
    });
    await db.insert(schema.groups).values({
      id: GROUP_ID,
      name: "Penya",
      competition: "laliga",
      inviteCode: "TEST01",
      createdById: USER_ID,
    });
    await db.insert(schema.groupMembers).values({
      id: generateId(),
      groupId: GROUP_ID,
      userId: USER_ID,
      points: 0,
    });
  }

  async function seedMatches(seeds: MatchSeed[]) {
    await db.insert(schema.matches).values(
      seeds.map((seed, index) => ({
        id: `m${index}`,
        externalId: -2000 - index,
        competition: "laliga" as const,
        homeTeam: `Home ${index}`,
        awayTeam: `Away ${index}`,
        homeScore: seed.status === "finished" ? 1 : null,
        awayScore: seed.status === "finished" ? 0 : null,
        matchday: seed.matchday,
        season: SEASON,
        status: seed.status,
        kickoff: seed.kickoff,
      })),
    );
  }

  beforeEach(reset);

  describe("with two started rounds, the earlier one unfinished", async () => {
    beforeEach(async () => {
      await seedMatches([
        // Matchday 7 kicked off days ago but still has a match to play, so it
        // is neither finished nor settled.
        {
          matchday: 7,
          kickoff: new Date(Date.now() - 5 * DAY),
          status: "finished",
        },
        {
          matchday: 7,
          kickoff: new Date(Date.now() + 2 * DAY),
          status: "scheduled",
        },
        {
          matchday: 8,
          kickoff: new Date(Date.now() - HOUR),
          status: "scheduled",
        },
        {
          matchday: 9,
          kickoff: new Date(Date.now() + 7 * DAY),
          status: "scheduled",
        },
      ]);
      await ensureRounds();
    });

    it("opens on the latest started round, not the unsettled one", async () => {
      const results = await getResultsRoundBoard("laliga");

      expect(results?.board.round.id).toBe(roundIdFor(8));
    });

    it("offers every started round, newest first, and no future one", async () => {
      const results = await getResultsRoundBoard("laliga");

      expect(results?.options.map((option) => option.matchday)).toEqual([8, 7]);
    });

    it("shows the round asked for", async () => {
      const results = await getResultsRoundBoard("laliga", roundIdFor(7));

      expect(results?.board.round.id).toBe(roundIdFor(7));
      expect(results?.board.matches).toHaveLength(2);
    });

    it("falls back to the latest round when asked for one that has not started", async () => {
      const results = await getResultsRoundBoard("laliga", roundIdFor(9));

      expect(results?.board.round.id).toBe(roundIdFor(8));
    });
  });

  it("shows the upcoming round when nothing has kicked off yet", async () => {
    await seedMatches([
      { matchday: 1, kickoff: new Date(Date.now() + DAY), status: "scheduled" },
      {
        matchday: 2,
        kickoff: new Date(Date.now() + 8 * DAY),
        status: "scheduled",
      },
    ]);
    await ensureRounds();

    const results = await getResultsRoundBoard("laliga");

    expect(results?.board.round.id).toBe(roundIdFor(1));
    expect(results?.options.map((option) => option.matchday)).toEqual([1]);
  });
});
