import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FootballDataMatch } from "@/lib/football/api";
import { fetchCompetitionMatches } from "@/lib/football/api";

/**
 * The conditional upsert lives entirely in SQL, so mocks cannot prove it works.
 * Opt in with RUN_DB_TESTS=1 and a throwaway DATABASE_URL — this truncates
 * `matches`. See settlement.integration.test.ts for the container recipe.
 */
const enabled = process.env.RUN_DB_TESTS === "1" && !!process.env.DATABASE_URL;

vi.mock("@/lib/football/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/football/api")>();
  return { ...actual, fetchCompetitionMatches: vi.fn() };
});

describe.skipIf(!enabled)("syncMatchesToDb against Postgres", async () => {
  const { sql } = await import("drizzle-orm");
  const { db } = await import("@/lib/db");
  const { syncMatchesToDb } = await import("./matches");

  function apiMatch(overrides: Partial<FootballDataMatch> = {}) {
    return {
      id: 900,
      utcDate: "2026-08-03T20:00:00Z",
      status: "IN_PLAY",
      matchday: 4,
      homeTeam: { id: 10, name: "Real Test", shortName: "Test", crest: "c1" },
      awayTeam: { id: 11, name: "Fake Utd", shortName: "Fake", crest: "c2" },
      score: { fullTime: { home: 1, away: 0 }, halfTime: { home: 1, away: 0 } },
      ...overrides,
    } satisfies FootballDataMatch;
  }

  async function storedUpdatedAt(): Promise<Date> {
    const row = await db.query.matches.findFirst();
    if (!row) throw new Error("match row missing");
    return row.updatedAt;
  }

  beforeEach(async () => {
    await db.execute(sql`truncate table matches cascade`);
    vi.clearAllMocks();
  });

  it("leaves updatedAt alone when the payload is unchanged", async () => {
    vi.mocked(fetchCompetitionMatches).mockResolvedValue([apiMatch()]);
    await syncMatchesToDb("laliga");
    const first = await storedUpdatedAt();

    await syncMatchesToDb("laliga");

    expect(await storedUpdatedAt()).toEqual(first);
  });

  it("bumps updatedAt when a score actually changes", async () => {
    vi.mocked(fetchCompetitionMatches).mockResolvedValue([apiMatch()]);
    await syncMatchesToDb("laliga");
    const first = await storedUpdatedAt();

    vi.mocked(fetchCompetitionMatches).mockResolvedValue([
      apiMatch({
        score: {
          fullTime: { home: 2, away: 0 },
          halfTime: { home: 1, away: 0 },
        },
      }),
    ]);
    await syncMatchesToDb("laliga");

    const row = await db.query.matches.findFirst();
    expect(row?.homeScore).toBe(2);
    expect(row?.updatedAt.getTime()).toBeGreaterThan(first.getTime());
  });

  it("bumps updatedAt when a fixture is rescheduled or goes final", async () => {
    vi.mocked(fetchCompetitionMatches).mockResolvedValue([apiMatch()]);
    await syncMatchesToDb("laliga");
    const first = await storedUpdatedAt();

    vi.mocked(fetchCompetitionMatches).mockResolvedValue([
      apiMatch({ status: "FINISHED", utcDate: "2026-08-04T20:00:00Z" }),
    ]);
    await syncMatchesToDb("laliga");

    const row = await db.query.matches.findFirst();
    expect(row?.status).toBe("finished");
    expect(row?.updatedAt.getTime()).toBeGreaterThan(first.getTime());
  });
});
