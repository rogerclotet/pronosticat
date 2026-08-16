import type {
  ChallengeTargetKind,
  TargetSide,
  ThresholdTier,
} from "@/lib/challenges/types";
import type { entries, matches, rounds } from "@/lib/db/schema";

export type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

/** A round fixture, serialised for the client (kickoff as ISO). */
export type BoardMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  kickoff: string;
  status: MatchStatus;
  homeTeamCrest?: string | null;
  awayTeamCrest?: string | null;
};

export type BoardSlotView = {
  id: string;
  slug: string;
  targetKind: ChallengeTargetKind;
  /** Set when the challenge only accepts one side of the fixture. */
  requiredSide?: TargetSide;
  reward: number;
  penalty: number;
  /** Payout steps, hardest first, when the slot scores against a bar. */
  tiers?: readonly ThresholdTier[];
};

export type EntryView = {
  id: string;
  roundChallengeId: string;
  targetMatchId: string | null;
  targetSide: TargetSide | null;
  predictedHome: number | null;
  predictedAway: number | null;
  numericValue: number | null;
  isJoker: boolean;
  pointsAwarded: number | null;
};

export type BoardRound = {
  id: string;
  matchday: number;
  status: "open" | "locked" | "settled";
  lockAt: string;
};

/** Dates don't survive the server/client boundary as Dates; send ISO strings. */
export function toBoardMatch(row: typeof matches.$inferSelect): BoardMatch {
  return {
    id: row.id,
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    homeScore: row.homeScore,
    awayScore: row.awayScore,
    kickoff: row.kickoff.toISOString(),
    status: row.status,
    homeTeamCrest: row.homeTeamCrest,
    awayTeamCrest: row.awayTeamCrest,
  };
}

export function toBoardRound(row: typeof rounds.$inferSelect): BoardRound {
  return {
    id: row.id,
    matchday: row.matchday,
    status: row.status,
    lockAt: row.lockAt.toISOString(),
  };
}

export function toEntryView(row: typeof entries.$inferSelect): EntryView {
  return {
    id: row.id,
    roundChallengeId: row.roundChallengeId,
    targetMatchId: row.targetMatchId,
    targetSide: row.targetSide,
    predictedHome: row.predictedHome,
    predictedAway: row.predictedAway,
    numericValue: row.numericValue,
    isJoker: row.isJoker,
    pointsAwarded: row.pointsAwarded,
  };
}

export function teamName(match: BoardMatch, side: TargetSide): string {
  return side === "home" ? match.homeTeam : match.awayTeam;
}

export function teamCrest(
  match: BoardMatch,
  side: TargetSide,
): string | null | undefined {
  return side === "home" ? match.homeTeamCrest : match.awayTeamCrest;
}

export type PickTeam = {
  name: string;
  crest: string | null | undefined;
};

/** Team(s) involved in a pick, for rendering crests. Empty for number picks or when unset. */
export function describePickTeams(
  slot: BoardSlotView,
  entry: EntryView | undefined,
  matches: BoardMatch[],
): PickTeam[] {
  if (!entry || slot.targetKind === "number") return [];

  const match = matches.find((m) => m.id === entry.targetMatchId);
  if (!match) return [];

  switch (slot.targetKind) {
    case "team":
      return entry.targetSide
        ? [
            {
              name: teamName(match, entry.targetSide),
              crest: teamCrest(match, entry.targetSide),
            },
          ]
        : [];
    case "match_score":
    case "match":
      return [
        { name: match.homeTeam, crest: match.homeTeamCrest },
        { name: match.awayTeam, crest: match.awayTeamCrest },
      ];
    default:
      return [];
  }
}

/** How a pick reads on the slot card. `null` when the slot is still empty. */
export function describePick(
  slot: BoardSlotView,
  entry: EntryView | undefined,
  matches: BoardMatch[],
): string | null {
  if (!entry) return null;

  if (slot.targetKind === "number") {
    return entry.numericValue === null ? null : String(entry.numericValue);
  }

  const match = matches.find((m) => m.id === entry.targetMatchId);
  if (!match) return null;

  switch (slot.targetKind) {
    case "team":
      return entry.targetSide ? teamName(match, entry.targetSide) : null;
    case "match_score":
      if (entry.predictedHome === null || entry.predictedAway === null) {
        return null;
      }
      return `${match.homeTeam} ${entry.predictedHome}-${entry.predictedAway} ${match.awayTeam}`;
    case "match":
      return `${match.homeTeam} – ${match.awayTeam}`;
    default:
      return null;
  }
}
