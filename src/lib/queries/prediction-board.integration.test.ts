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
 * Which round the predictions screen opens on, and which ones it can reach,
 * against a real Postgres. Opt in with RUN_DB_TESTS=1 and a DATABASE_URL
 * pointing at a throwaway database — this truncates every app table it
 * touches. See `src/lib/rounds/settlement.integration.test.ts` for the setup.
 */
const enabled = process.env.RUN_DB_TESTS === "1" && !!process.env.DATABASE_URL;

describe.skipIf(!enabled)("prediction board against Postgres", async () => {
  const { sql } = await import("drizzle-orm");
  const { db } = await import("@/lib/db");
  const schema = await import("@/lib/db/schema");
  const { ensureRounds } = await import("@/lib/rounds/ensure");
  const { getPredictionBoard } = await import("@/lib/queries/round-board");
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
        externalId: -3000 - index,
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

  describe("with two rounds played and one still taking picks", async () => {
    beforeEach(async () => {
      await seedMatches([
        {
          matchday: 7,
          kickoff: new Date(Date.now() - 8 * DAY),
          status: "finished",
        },
        {
          matchday: 8,
          kickoff: new Date(Date.now() - HOUR),
          status: "scheduled",
        },
        {
          matchday: 9,
          kickoff: new Date(Date.now() + 2 * DAY),
          status: "scheduled",
        },
      ]);
      await ensureRounds();
    });

    it("opens on the round still accepting picks", async () => {
      const prediction = await getPredictionBoard("laliga");

      expect(prediction?.board.round.id).toBe(roundIdFor(9));
    });

    it("offers the open round first, then every started one, newest first", async () => {
      const prediction = await getPredictionBoard("laliga");

      expect(prediction?.options.map((option) => option.matchday)).toEqual([
        9, 8, 7,
      ]);
      expect(prediction?.options[0].open).toBe(true);
    });

    it("shows a settled round when asked for it", async () => {
      const prediction = await getPredictionBoard("laliga", roundIdFor(7));

      expect(prediction?.board.round.id).toBe(roundIdFor(7));
      expect(prediction?.board.matches).toHaveLength(1);
    });

    it("falls back to the open round for an unknown id", async () => {
      const prediction = await getPredictionBoard("laliga", "nonsense");

      expect(prediction?.board.round.id).toBe(roundIdFor(9));
    });
  });

  it("opens on the latest started round when nothing takes picks any more", async () => {
    await seedMatches([
      {
        matchday: 1,
        kickoff: new Date(Date.now() - 8 * DAY),
        status: "finished",
      },
      {
        matchday: 2,
        kickoff: new Date(Date.now() - HOUR),
        status: "scheduled",
      },
    ]);
    await ensureRounds();

    const prediction = await getPredictionBoard("laliga");

    expect(prediction?.board.round.id).toBe(roundIdFor(2));
    expect(prediction?.options.map((option) => option.matchday)).toEqual([
      2, 1,
    ]);
  });
});
