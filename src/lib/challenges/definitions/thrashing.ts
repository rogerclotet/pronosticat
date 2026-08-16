import { scoreAtLeast } from "@/lib/challenges/definitions/thresholds";
import {
  type ChallengeDefinition,
  findTargetMatch,
  type ResolvedMatch,
  type ThresholdTier,
} from "@/lib/challenges/types";

/** Two clear goals is common enough to be a fair bar; four is a proper hiding. */
const TIERS: readonly ThresholdTier[] = [
  { bar: 4, reward: 100 },
  { bar: 2, reward: 35 },
];
const PENALTY = 0;

export function goalDifference(match: ResolvedMatch): number {
  return Math.abs(match.homeScore - match.awayScore);
}

/** La pallissa: a match won by two goals or more, whichever side wins. */
export const thrashing: ChallengeDefinition = {
  slug: "thrashing",
  targetKind: "match",
  reward: TIERS[0].reward,
  penalty: PENALTY,
  tiers: TIERS,
  score: (target, round) => {
    const match = findTargetMatch(target, round);
    if (!match) return null;
    return scoreAtLeast(goalDifference(match), TIERS);
  },
};
