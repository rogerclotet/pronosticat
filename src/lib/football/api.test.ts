import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type FootballDataMatch,
  FootballDataRateLimitError,
  fetchCompetitionMatches,
  mapMatchStatus,
} from "./api";

vi.mock("@/lib/football/rate-limit", () => ({
  withFootballApiRateLimit: <T>(fn: () => Promise<T>) => fn(),
}));

function makeMatch(
  overrides: Partial<FootballDataMatch> = {},
): FootballDataMatch {
  return {
    id: 1,
    utcDate: "2026-08-03T18:00:00Z",
    status: "SCHEDULED",
    matchday: 1,
    homeTeam: {
      id: 1,
      name: "Home FC",
      shortName: "Home",
      crest: "https://example.com/home.png",
    },
    awayTeam: {
      id: 2,
      name: "Away FC",
      shortName: "Away",
      crest: "https://example.com/away.png",
    },
    score: { fullTime: { home: null, away: null } },
    ...overrides,
  };
}

describe("mapMatchStatus", () => {
  it("maps API statuses to app statuses", () => {
    expect(mapMatchStatus("SCHEDULED")).toBe("scheduled");
    expect(mapMatchStatus("IN_PLAY")).toBe("live");
    expect(mapMatchStatus("PAUSED")).toBe("live");
    expect(mapMatchStatus("LIVE")).toBe("live");
    expect(mapMatchStatus("FINISHED")).toBe("finished");
    expect(mapMatchStatus("POSTPONED")).toBe("postponed");
    expect(mapMatchStatus("CANCELLED")).toBe("cancelled");
    expect(mapMatchStatus("SUSPENDED")).toBe("cancelled");
  });
});

describe("fetchCompetitionMatches", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.FOOTBALL_DATA_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches and returns matches from football-data.org", async () => {
    const apiMatches = [makeMatch({ id: 42 })];
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ matches: apiMatches }), { status: 200 }),
    );

    const result = await fetchCompetitionMatches("PD");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.football-data.org/v4/competitions/PD/matches?status=SCHEDULED%2CLIVE%2CFINISHED",
      expect.objectContaining({
        headers: { "X-Auth-Token": "test-key" },
      }),
    );
    expect(result).toEqual(apiMatches);
  });

  it("retries once after a 429 response", async () => {
    vi.useFakeTimers();
    const apiMatches = [makeMatch({ id: 7 })];
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(null, {
          status: 429,
          headers: { "Retry-After": "1" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ matches: apiMatches }), { status: 200 }),
      );

    const promise = fetchCompetitionMatches("PL");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual(apiMatches);
    vi.useRealTimers();
  });

  it("throws FootballDataRateLimitError after repeated 429 responses", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(null, {
          status: 429,
          headers: { "Retry-After": "1" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 429,
          headers: { "Retry-After": "1" },
        }),
      );

    const promise = fetchCompetitionMatches("CL");
    const assertion = expect(promise).rejects.toBeInstanceOf(
      FootballDataRateLimitError,
    );
    await vi.runAllTimersAsync();
    await assertion;
    vi.useRealTimers();
  });

  it("throws on non-OK responses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));

    await expect(fetchCompetitionMatches("PD")).rejects.toThrow(
      "Football Data API error: 500",
    );
  });
});
