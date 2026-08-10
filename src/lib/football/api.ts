import { DATA_CACHE_TTL } from "@/lib/constants";
import { withFootballApiRateLimit } from "@/lib/football/rate-limit";

export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  homeTeam: { id: number; name: string; shortName: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; crest: string };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime?: { home: number | null; away: number | null };
  };
};

export type FootballDataResponse = {
  matches: FootballDataMatch[];
};

export class FootballDataRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`Football Data API rate limited (retry after ${retryAfterSeconds}s)`);
    this.name = "FootballDataRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const BASE_URL = "https://api.football-data.org/v4";

function getHeaders(): HeadersInit {
  return {
    "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY ?? "",
  };
}

function parseRetryAfter(header: string | null): number {
  if (!header) return 60;
  const seconds = Number.parseInt(header, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFootballData(url: string): Promise<Response> {
  return withFootballApiRateLimit(async () => {
    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: DATA_CACHE_TTL },
    });

    if (res.status === 429) {
      const retryAfterSeconds = parseRetryAfter(res.headers.get("Retry-After"));
      console.warn(
        `[pronosticat] Football Data API 429, retry after ${retryAfterSeconds}s`,
      );
      await sleep(retryAfterSeconds * 1000);
      const retry = await fetch(url, {
        headers: getHeaders(),
        next: { revalidate: DATA_CACHE_TTL },
      });
      if (retry.status === 429) {
        throw new FootballDataRateLimitError(retryAfterSeconds);
      }
      return retry;
    }

    return res;
  });
}

export async function fetchCompetitionMatches(
  competitionCode: string,
): Promise<FootballDataMatch[]> {
  const params = new URLSearchParams({ status: "SCHEDULED,LIVE,FINISHED" });
  const url = `${BASE_URL}/competitions/${competitionCode}/matches?${params}`;
  const res = await fetchFootballData(url);

  if (!res.ok) {
    throw new Error(`Football Data API error: ${res.status}`);
  }

  const data: FootballDataResponse = await res.json();
  return data.matches ?? [];
}

export function mapMatchStatus(
  status: string,
): "scheduled" | "live" | "finished" | "postponed" | "cancelled" {
  switch (status) {
    case "IN_PLAY":
    case "PAUSED":
    case "LIVE":
      return "live";
    case "FINISHED":
      return "finished";
    case "POSTPONED":
      return "postponed";
    case "CANCELLED":
    case "SUSPENDED":
      return "cancelled";
    default:
      return "scheduled";
  }
}
