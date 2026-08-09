import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncMatchesToDb } from "./matches";
import {
  fetchCompetitionMatches,
  mapMatchStatus,
  type FootballDataMatch,
} from "@/lib/football/api";

const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }));
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

function makeMatch(overrides: Partial<FootballDataMatch> = {}): FootballDataMatch {
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
    score: { fullTime: { home: 2, away: 1 } },
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
    expect(mockValues).toHaveBeenCalledWith({
      id: "laliga-100",
      externalId: 100,
      competition: "laliga",
      homeTeam: "Test",
      awayTeam: "Fake",
      homeTeamCrest: "https://example.com/test.png",
      awayTeamCrest: "https://example.com/fake.png",
      homeScore: 2,
      awayScore: 1,
      matchday: 4,
      status: mapMatchStatus("FINISHED"),
      kickoff: new Date("2026-08-03T20:00:00Z"),
    });
    expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({
          homeScore: 2,
          awayScore: 1,
          status: "finished",
        }),
      }),
    );
  });

  it("syncs multiple matches in one competition", async () => {
    vi.mocked(fetchCompetitionMatches).mockResolvedValue([
      makeMatch({ id: 1 }),
      makeMatch({ id: 2, status: "SCHEDULED", score: { fullTime: { home: null, away: null } } }),
    ]);

    await syncMatchesToDb("premier_league");

    expect(fetchCompetitionMatches).toHaveBeenCalledWith("PL");
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });
});
