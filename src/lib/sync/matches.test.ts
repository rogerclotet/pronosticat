import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type FootballDataMatch,
  fetchCompetitionMatches,
  mapMatchStatus,
} from "@/lib/football/api";
import { syncMatchesToDb } from "./matches";

const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
const mockValues = vi.fn(() => ({
  onConflictDoUpdate: mockOnConflictDoUpdate,
}));
const mockInsert = vi.fn(() => ({ values: mockValues }));

vi.mock("@/lib/db", () => ({
  db: {
    insert: () => mockInsert(),
  },
}));

vi.mock("@/lib/football/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/football/api")>();
  return {
    ...actual,
    fetchCompetitionMatches: vi.fn(),
  };
});

function makeMatch(
  overrides: Partial<FootballDataMatch> = {},
): FootballDataMatch {
  return {
    id: 100,
    utcDate: "2026-08-03T20:00:00Z",
    status: "FINISHED",
    matchday: 4,
    homeTeam: {
      id: 10,
      name: "Real Test",
      shortName: "Test",
      crest: "https://example.com/test.png",
    },
    awayTeam: {
      id: 11,
      name: "Fake United",
      shortName: "Fake",
      crest: "https://example.com/fake.png",
    },
    score: { fullTime: { home: 2, away: 1 }, halfTime: { home: 1, away: 0 } },
    ...overrides,
  };
}

describe("syncMatchesToDb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts matches returned by the football-data.org API", async () => {
    const apiMatch = makeMatch();
    vi.mocked(fetchCompetitionMatches).mockResolvedValue([apiMatch]);

    await syncMatchesToDb("laliga");

    expect(fetchCompetitionMatches).toHaveBeenCalledWith("PD");
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith([
      {
        id: "laliga-100",
        externalId: 100,
        competition: "laliga",
        homeTeam: "Test",
        awayTeam: "Fake",
        homeTeamCrest: "https://example.com/test.png",
        awayTeamCrest: "https://example.com/fake.png",
        homeScore: 2,
        awayScore: 1,
        homeScoreHt: 1,
        awayScoreHt: 0,
        matchday: 4,
        season: 2026,
        status: mapMatchStatus("FINISHED"),
        kickoff: new Date("2026-08-03T20:00:00Z"),
      },
    ]);
    expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({
          homeScore: expect.anything(),
          awayScore: expect.anything(),
          status: expect.anything(),
        }),
      }),
    );
  });

  it("moves rescheduled fixtures on conflict, so round deadlines follow", async () => {
    vi.mocked(fetchCompetitionMatches).mockResolvedValue([
      makeMatch({ utcDate: "2026-08-10T18:00:00Z", matchday: 5 }),
    ]);

    await syncMatchesToDb("laliga");

    expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({
          kickoff: expect.anything(),
          matchday: expect.anything(),
        }),
      }),
    );
  });

  it("takes the season from the API when it is given", async () => {
    vi.mocked(fetchCompetitionMatches).mockResolvedValue([
      // A May fixture belongs to the season that started the previous August.
      makeMatch({
        utcDate: "2027-05-20T18:00:00Z",
        season: { startDate: "2026-08-14" },
      }),
    ]);

    await syncMatchesToDb("laliga");

    expect(mockValues).toHaveBeenCalledWith([
      expect.objectContaining({ season: 2026 }),
    ]);
  });

  it("falls back to the kickoff date when the API omits the season", async () => {
    vi.mocked(fetchCompetitionMatches).mockResolvedValue([
      makeMatch({ utcDate: "2027-05-20T18:00:00Z", season: null }),
    ]);

    await syncMatchesToDb("laliga");

    expect(mockValues).toHaveBeenCalledWith([
      expect.objectContaining({ season: 2026 }),
    ]);
  });

  it("tolerates a payload without half-time scores", async () => {
    vi.mocked(fetchCompetitionMatches).mockResolvedValue([
      makeMatch({ score: { fullTime: { home: null, away: null } } }),
    ]);

    await syncMatchesToDb("laliga");

    expect(mockValues).toHaveBeenCalledWith([
      expect.objectContaining({ homeScoreHt: null, awayScoreHt: null }),
    ]);
  });

  it("syncs multiple matches in one competition", async () => {
    vi.mocked(fetchCompetitionMatches).mockResolvedValue([
      makeMatch({ id: 1 }),
      makeMatch({
        id: 2,
        status: "SCHEDULED",
        score: { fullTime: { home: null, away: null } },
      }),
    ]);

    await syncMatchesToDb("premier_league");

    expect(fetchCompetitionMatches).toHaveBeenCalledWith("PL");
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "premier_league-1" }),
        expect.objectContaining({ id: "premier_league-2" }),
      ]),
    );
  });
});
