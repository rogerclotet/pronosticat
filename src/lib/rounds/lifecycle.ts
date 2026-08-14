import type { ResolvedMatch } from "@/lib/challenges/types";
import { ROUND_SETTLE_GRACE_HOURS } from "@/lib/constants";
import type { matches } from "@/lib/db/schema";

type MatchRow = typeof matches.$inferSelect;

/** Statuses a match will never move on from, so the round need not wait for it. */
const TERMINAL_STATUSES = new Set(["finished", "cancelled"]);

const GRACE_MS = ROUND_SETTLE_GRACE_HOURS * 60 * 60 * 1000;

export function roundId(competition: string, matchday: number): string {
  return `${competition}-${matchday}`;
}

/**
 * A round settles once nothing is left to play, or once the grace period past
 * its last kickoff has elapsed — otherwise a single postponed fixture would
 * hold the whole board hostage for weeks.
 */
export function isRoundSettleable(
  roundMatches: MatchRow[],
  now: Date,
): boolean {
  if (roundMatches.length === 0) return false;
  if (roundMatches.every((match) => TERMINAL_STATUSES.has(match.status))) {
    return true;
  }

  const lastKickoff = Math.max(
    ...roundMatches.map((match) => match.kickoff.getTime()),
  );
  return now.getTime() > lastKickoff + GRACE_MS;
}

/** The subset of a round that actually produced a result to score against. */
export function toResolvedMatches(roundMatches: MatchRow[]): ResolvedMatch[] {
  return roundMatches
    .filter(
      (match) =>
        match.status === "finished" &&
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
