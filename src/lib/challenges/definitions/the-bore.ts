import { totalGoals } from "@/lib/challenges/definitions/goal-fest";
import {
  scoreAtMost,
  tierPayouts,
} from "@/lib/challenges/definitions/thresholds";
import {
  type ChallengeDefinition,
  findTargetMatch,
  type ThresholdTier,
} from "@/lib/challenges/types";

/** One goal is a quiet afternoon; goalless is the full bore. */
const TIERS: readonly ThresholdTier[] = [
  { bar: 0, reward: 100 },
  { bar: 1, reward: 50 },
];
const PENALTY = 0;

/** El rotllo: a match that ends with one goal or none. */
export const theBore: ChallengeDefinition = {
  slug: "the_bore",
  targetKind: "match",
  reward: TIERS[0].reward,
  penalty: PENALTY,
  payouts: tierPayouts(TIERS),
  score: (target, round) => {
    const match = findTargetMatch(target, round);
    if (!match) return null;
    return scoreAtMost(totalGoals(match), TIERS);
  },
};
