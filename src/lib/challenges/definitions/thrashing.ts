import {
  type ChallengeDefinition,
  findTargetMatch,
  type ResolvedMatch,
} from "@/lib/challenges/types";

const REWARD = 80;
const PENALTY = 0;

export function goalDifference(match: ResolvedMatch): number {
  return Math.abs(match.homeScore - match.awayScore);
}

/** La pallissa: pick the most one-sided match of the round. Ties all win. */
export const thrashing: ChallengeDefinition = {
  slug: "thrashing",
  targetKind: "match",
  reward: REWARD,
  penalty: PENALTY,
  score: (target, round) => {
    const match = findTargetMatch(target, round);
    if (!match) return null;

    const best = Math.max(...round.map(goalDifference));
    return goalDifference(match) === best ? REWARD : PENALTY;
  },
};
