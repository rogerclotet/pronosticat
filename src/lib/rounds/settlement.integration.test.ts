import { beforeEach, describe, expect, it } from "vitest";

/**
 * Exercises the real round lifecycle against a real Postgres. Opt in with
 * RUN_DB_TESTS=1 and a DATABASE_URL pointing at a throwaway database — this
 * truncates every app table it touches.
 *
 *   docker run -d --name pg -e POSTGRES_USER=p -e POSTGRES_PASSWORD=p \
 *     -e POSTGRES_DB=p -p 55099:5432 postgres:16-alpine
 *   DATABASE_URL=postgresql://p:p@localhost:55099/p npx drizzle-kit migrate
 *   RUN_DB_TESTS=1 DATABASE_URL=postgresql://p:p@localhost:55099/p npx vitest run
 */
const enabled = process.env.RUN_DB_TESTS === "1" && !!process.env.DATABASE_URL;

describe.skipIf(!enabled)("round settlement against Postgres", async () => {
  const { sql } = await import("drizzle-orm");
  const { db } = await import("@/lib/db");
  const schema = await import("@/lib/db/schema");
  const { ensureRounds } = await import("@/lib/rounds/ensure");
  const { lockOpenRounds, settleLockedRounds } = await import(
    "@/lib/rounds/scoring"
  );
  const { generateId, ROUND_SETTLE_GRACE_HOURS } = await import("@/lib/constants");

  const USER_ID = "u-test";
  const GROUP_ID = "g-test";
  const HOUR = 60 * 60 * 1000;

  type MatchSeed = {
    id: string;
    matchday: number;
    home: string;
    away: string;
    homeScore: number | null;
    awayScore: number | null;
    status: "scheduled" | "finished" | "postponed";
    kickoff: Date;
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
      points: 1000,
    });
  }

  async function seedMatches(seeds: MatchSeed[]) {
    await db.insert(schema.matches).values(
      seeds.map((seed, index) => ({
        id: seed.id,
        externalId: -1000 - index,
        competition: "laliga" as const,
        homeTeam: seed.home,
        awayTeam: seed.away,
        homeScore: seed.homeScore,
        awayScore: seed.awayScore,
        matchday: seed.matchday,
        status: seed.status,
        kickoff: seed.kickoff,
      })),
    );
  }

  async function addEntry(
    slug: string,
    target: Partial<typeof schema.entries.$inferInsert>,
  ) {
    await db.insert(schema.entries).values({
      id: generateId(),
      userId: USER_ID,
      groupId: GROUP_ID,
      roundChallengeId: `laliga-7-${slug}`,
      roundId: "laliga-7",
      ...target,
    });
  }

  async function points(): Promise<number> {
    const member = await db.query.groupMembers.findFirst();
    return member?.points ?? 0;
  }

  beforeEach(reset);

  it("builds a board, locks it at first kickoff, and pays out the round", async () => {
    const kickoff = new Date(Date.now() - 3 * HOUR);
    await seedMatches([
      // 4 goals, diff 2 — ties goal_fest with m2
      { id: "m1", matchday: 7, home: "Girona", away: "Elx", homeScore: 3, awayScore: 1, status: "finished", kickoff },
      // 4 goals, diff 4 — thrashing winner, Barça is top scorer
      { id: "m2", matchday: 7, home: "Barça", away: "Getafe", homeScore: 4, awayScore: 0, status: "finished", kickoff },
      { id: "m3", matchday: 7, home: "Betis", away: "Sevilla", homeScore: 0, awayScore: 1, status: "finished", kickoff },
    ]);

    await ensureRounds();

    const board = await db.query.rounds.findFirst({ with: { challenges: true } });
    expect(board?.id).toBe("laliga-7");
    expect(board?.status).toBe("open");
    expect(board?.challenges).toHaveLength(6);
    expect(board?.lockAt.getTime()).toBe(kickoff.getTime());

    await addEntry("exact_score", {
      targetMatchId: "m1",
      predictedHome: 3,
      predictedAway: 1,
    });
    await addEntry("goal_fest", { targetMatchId: "m1" });
    await addEntry("thrashing", { targetMatchId: "m1" });
    await addEntry("goal_machine", {
      targetMatchId: "m2",
      targetSide: "home",
      isJoker: true,
    });
    await addEntry("banker", { targetMatchId: "m3", targetSide: "home" });

    await lockOpenRounds();
    const locked = await db.query.rounds.findFirst();
    expect(locked?.status).toBe("locked");
    const lockedEntries = await db.query.entries.findMany();
    expect(lockedEntries.every((e) => e.lockedAt !== null)).toBe(true);
    expect(await points()).toBe(1000); // slots are free: nothing is charged at lock

    await settleLockedRounds();

    const settled = await db.query.rounds.findFirst();
    expect(settled?.status).toBe("settled");
    expect(settled?.settledAt).not.toBeNull();

    const scored = await db.query.entries.findMany({
      with: { roundChallenge: true },
    });
    const bySlug = Object.fromEntries(
      scored.map((e) => [e.roundChallenge.slug, e.pointsAwarded]),
    );

    expect(bySlug).toEqual({
      exact_score: 100, // clavat
      goal_fest: 80, // tied on goals, still counts
      thrashing: 0, // m2 was the thrashing, not m1
      goal_machine: 160, // 80 doubled by the joker
      banker: -40, // Betis lost
    });
    expect(await points()).toBe(1000 + 300);
  });

  it("is idempotent: a second scoring run does not pay twice", async () => {
    const kickoff = new Date(Date.now() - 3 * HOUR);
    await seedMatches([
      { id: "m1", matchday: 7, home: "Girona", away: "Elx", homeScore: 3, awayScore: 1, status: "finished", kickoff },
    ]);
    await ensureRounds();
    await addEntry("banker", { targetMatchId: "m1", targetSide: "home" });

    await lockOpenRounds();
    await settleLockedRounds();
    expect(await points()).toBe(1040);

    await ensureRounds();
    await lockOpenRounds();
    await settleLockedRounds();
    expect(await points()).toBe(1040);
  });

  it("waits on a postponed match, then settles once the grace period passes", async () => {
    const kickoff = new Date(Date.now() - 3 * HOUR);
    await seedMatches([
      { id: "m1", matchday: 7, home: "Girona", away: "Elx", homeScore: 3, awayScore: 1, status: "finished", kickoff },
      { id: "m2", matchday: 7, home: "Cadis", away: "Osasuna", homeScore: null, awayScore: null, status: "postponed", kickoff },
    ]);
    await ensureRounds();
    await addEntry("banker", { targetMatchId: "m1", targetSide: "home" });
    await lockOpenRounds();

    await settleLockedRounds();
    expect((await db.query.rounds.findFirst())?.status).toBe("locked");
    expect(await points()).toBe(1000);

    // Push both kickoffs past the grace window.
    const stale = new Date(Date.now() - (ROUND_SETTLE_GRACE_HOURS + 1) * HOUR);
    await db.update(schema.matches).set({ kickoff: stale });

    await settleLockedRounds();
    expect((await db.query.rounds.findFirst())?.status).toBe("settled");
    expect(await points()).toBe(1040);
  });

  it("refuses a second joker in the same round", async () => {
    const kickoff = new Date(Date.now() + 3 * HOUR);
    await seedMatches([
      { id: "m1", matchday: 7, home: "Girona", away: "Elx", homeScore: null, awayScore: null, status: "scheduled", kickoff },
    ]);
    await ensureRounds();

    await addEntry("banker", { targetMatchId: "m1", targetSide: "home", isJoker: true });
    await expect(
      addEntry("goal_fest", { targetMatchId: "m1", isJoker: true }),
    ).rejects.toThrow();
  });

  it("reports hits and misses per member in the standings", async () => {
    const { getStandings } = await import("@/lib/queries/groups");
    const kickoff = new Date(Date.now() - 3 * HOUR);
    await seedMatches([
      { id: "m1", matchday: 7, home: "Girona", away: "Elx", homeScore: 3, awayScore: 1, status: "finished", kickoff },
      { id: "m2", matchday: 7, home: "Barça", away: "Getafe", homeScore: 4, awayScore: 0, status: "finished", kickoff },
    ]);
    await ensureRounds();

    // A member with no settled entries at all must still show up, on zeroes.
    await db.insert(schema.user).values({
      id: "u-idle",
      name: "Idle",
      email: "idle@example.com",
    });
    await db.insert(schema.groupMembers).values({
      id: generateId(),
      groupId: GROUP_ID,
      userId: "u-idle",
      points: 1000,
    });

    await addEntry("banker", { targetMatchId: "m1", targetSide: "home" }); // hit
    await addEntry("thrashing", { targetMatchId: "m1" }); // miss: m2 was the thrashing
    await lockOpenRounds();
    await settleLockedRounds();

    const standings = await getStandings(GROUP_ID);
    expect(standings).toEqual([
      { userId: USER_ID, name: "Test", points: 1040, hits: 1, misses: 1 },
      { userId: "u-idle", name: "Idle", points: 1000, hits: 0, misses: 0 },
    ]);
  });
});
