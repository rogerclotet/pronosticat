import { seasonFromDate } from "@/lib/constants";
import { withFootballApiRateLimit } from "@/lib/football/rate-limit";

export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  /** Present on v4 competition responses; we fall back to the kickoff date. */
  season?: { startDate?: string | null } | null;
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

const DEFAULT_RETRY_AFTER_SECONDS = 60;
/**
 * Never hold a sync open longer than the cron route's own budget. A longer
 * Retry-After is honoured by giving up now; the next tick retries anyway.
 */
const MAX_RETRY_AFTER_SECONDS = 60;

function parseRetryAfter(header: string | null): number {
  if (!header) return DEFAULT_RETRY_AFTER_SECONDS;
  const seconds = Number.parseInt(header, 10);
  return Number.isFinite(seconds) && seconds > 0
    ? seconds
    : DEFAULT_RETRY_AFTER_SECONDS;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const FETCH_TIMEOUT_MS = 15_000;

async function fetchFootballData(url: string): Promise<Response> {
  return withFootballApiRateLimit(async () => {
    const res = await fetch(url, {
      headers: getHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (res.status === 429) {
      const retryAfterSeconds = parseRetryAfter(res.headers.get("Retry-After"));
      console.warn(
        `[pronosticat] Football Data API 429, retry after ${retryAfterSeconds}s`,
      );
      if (retryAfterSeconds > MAX_RETRY_AFTER_SECONDS) {
        throw new FootballDataRateLimitError(retryAfterSeconds);
      }
      await sleep(retryAfterSeconds * 1000);
      const retry = await fetch(url, {
        headers: getHeaders(),
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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

/**
 * The API dates a season by its start date; a fixture's own kickoff is the
 * fallback, and is correct except for matches played in the calendar year the
 * season started but before July, which European seasons do not have.
 */
export function mapSeason(match: FootballDataMatch): number {
  const startDate = match.season?.startDate;
  if (startDate) {
    const parsed = new Date(startDate);
    if (!Number.isNaN(parsed.getTime())) return parsed.getUTCFullYear();
  }
  return seasonFromDate(new Date(match.utcDate));
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
