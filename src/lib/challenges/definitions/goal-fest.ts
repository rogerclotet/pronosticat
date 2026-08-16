import { scoreAtLeast } from "@/lib/challenges/definitions/thresholds";
import {
  type ChallengeDefinition,
  findTargetMatch,
  type ResolvedMatch,
  type ThresholdTier,
} from "@/lib/challenges/types";

/** Roughly a quarter of matches clear four goals; six is a rarity. */
const TIERS: readonly ThresholdTier[] = [
  { bar: 6, reward: 100 },
  { bar: 4, reward: 50 },
];
const PENALTY = 0;

export function totalGoals(match: ResolvedMatch): number {
  return match.homeScore + match.awayScore;
}

/**
 * La golejada: a match that clears four goals. Every qualifying match pays,
 * so the pick stands or falls on its own scoreline rather than on whatever
 * the rest of the round happened to do.
 */
export const goalFest: ChallengeDefinition = {
  slug: "goal_fest",
  targetKind: "match",
  reward: TIERS[0].reward,
  penalty: PENALTY,
  tiers: TIERS,
  score: (target, round) => {
    const match = findTargetMatch(target, round);
    if (!match) return null;
    return scoreAtLeast(totalGoals(match), TIERS);
  },
};
