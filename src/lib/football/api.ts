export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  homeTeam: { id: number; name: string; shortName: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; crest: string };
  score: {
    fullTime: { home: number | null; away: number | null };
  };
};

export type FootballDataResponse = {
  matches: FootballDataMatch[];
};

const BASE_URL = "https://api.football-data.org/v4";

function getHeaders(): HeadersInit {
  return {
    "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY ?? "",
  };
}

export async function fetchCompetitionMatches(
  competitionCode: string,
  matchday?: number,
): Promise<FootballDataMatch[]> {
  const params = new URLSearchParams({ status: "SCHEDULED,LIVE,FINISHED" });
  if (matchday !== undefined) {
    params.set("matchday", String(matchday));
  }

  const url = `${BASE_URL}/competitions/${competitionCode}/matches?${params}`;
  const res = await fetch(url, { headers: getHeaders(), next: { revalidate: 300 } });

  if (!res.ok) {
    throw new Error(`Football Data API error: ${res.status}`);
  }

  const data: FootballDataResponse = await res.json();
  return data.matches ?? [];
}

export async function fetchCurrentMatchday(
  competitionCode: string,
): Promise<number> {
  const url = `${BASE_URL}/competitions/${competitionCode}/matches?status=SCHEDULED,LIVE`;
  const res = await fetch(url, { headers: getHeaders(), next: { revalidate: 300 } });

  if (!res.ok) return 1;

  const data: FootballDataResponse = await res.json();
  if (data.matches.length === 0) return 1;

  const matchdays = data.matches
    .map((m) => m.matchday)
    .filter((d): d is number => d !== null);
  return matchdays.length > 0 ? Math.min(...matchdays) : 1;
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
