/** What a player has to point their slot at. */
export type ChallengeTargetKind =
  /** A match plus the exact scoreline. */
  | "match_score"
  /** One match of the round. */
  | "match"
  /** One team of the round, addressed as (match, side). */
  | "team"
  /** A plain number about the round as a whole. */
  | "number";

export type TargetSide = "home" | "away";

/** A played match of the round, with scores guaranteed present. */
export type ResolvedMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homeScoreHt: number | null;
  awayScoreHt: number | null;
};

/** The pick itself, stripped of storage concerns. */
export type EntryTarget = {
  matchId: string | null;
  side: TargetSide | null;
  predictedHome: number | null;
  predictedAway: number | null;
  numericValue: number | null;
};

export type ChallengeDefinition = {
  slug: string;
  targetKind: ChallengeTargetKind;
  /**
   * For `team` challenges that only make sense on one side of the fixture
   * (an away win, say). The picker hides the other side and a pick that
   * names it is rejected, rather than silently scoring as a miss.
   */
  requiredSide?: TargetSide;
  /** Headline payout, shown on the slot card. */
  reward: number;
  /** Cost of a miss. Negative or zero. */
  penalty: number;
  /**
   * Points before the joker is applied. Returns `null` when the pick cannot be
   * resolved at all — an empty round, or a target that was never played — in
   * which case the slot is treated as void rather than as a miss.
   */
  score: (target: EntryTarget, round: ResolvedMatch[]) => number | null;
};

export function findTargetMatch(
  target: EntryTarget,
  round: ResolvedMatch[],
): ResolvedMatch | null {
  if (!target.matchId) return null;
  return round.find((match) => match.id === target.matchId) ?? null;
}

/** Goals scored by, and conceded by, the picked side of the picked match. */
export function resolveTeamTarget(
  target: EntryTarget,
  round: ResolvedMatch[],
): { scored: number; conceded: number; team: string } | null {
  const match = findTargetMatch(target, round);
  if (!match || !target.side) return null;

  return target.side === "home"
    ? { scored: match.homeScore, conceded: match.awayScore, team: match.homeTeam }
    : { scored: match.awayScore, conceded: match.homeScore, team: match.awayTeam };
}
