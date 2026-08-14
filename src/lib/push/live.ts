import type { ResolvedMatch } from "@/lib/challenges/types";
import type { matches } from "@/lib/db/schema";

type MatchRow = typeof matches.$inferSelect;

/** Finished and in-play matches that already have a scoreline to evaluate. */
export function toScoredSnapshot(roundMatches: MatchRow[]): ResolvedMatch[] {
  return roundMatches
    .filter(
      (match) =>
        (match.status === "finished" || match.status === "live") &&
        match.homeScore !== null &&
        match.awayScore !== null,
    )
    .map((match) => ({
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore as number,
      awayScore: match.awayScore as number,
      homeScoreHt: match.homeScoreHt,
      awayScoreHt: match.awayScoreHt,
    }));
}

export function matchHasGoals(match: {
  homeScore: number | null;
  awayScore: number | null;
}): boolean {
  return (match.homeScore ?? 0) + (match.awayScore ?? 0) > 0;
}

export function liveSwingWinning(points: number | null): boolean | null {
  if (points === null) return null;
  return points > 0;
}
