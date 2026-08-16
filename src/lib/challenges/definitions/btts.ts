import {
  scoreAtLeast,
  tierPayouts,
} from "@/lib/challenges/definitions/thresholds";
import {
  type ChallengeDefinition,
  findTargetMatch,
  type ThresholdTier,
} from "@/lib/challenges/types";

/**
 * Both teams scoring at all is close to a coin flip, so it pays like one; the
 * money is in both of them scoring twice.
 */
const TIERS: readonly ThresholdTier[] = [
  { bar: 2, reward: 100 },
  { bar: 1, reward: 20 },
];
const PENALTY = 0;

/** Marquen tots dos: both teams score, and the more each scores the better. */
export const btts: ChallengeDefinition = {
  slug: "btts",
  targetKind: "match",
  reward: TIERS[0].reward,
  penalty: PENALTY,
  payouts: tierPayouts(TIERS),
  score: (target, round) => {
    const match = findTargetMatch(target, round);
    if (!match) return null;
    return scoreAtLeast(Math.min(match.homeScore, match.awayScore), TIERS);
  },
};
