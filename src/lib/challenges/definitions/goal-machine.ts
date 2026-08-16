import { scoreAtLeast } from "@/lib/challenges/definitions/thresholds";
import {
  type ChallengeDefinition,
  resolveTeamTarget,
  type ThresholdTier,
} from "@/lib/challenges/types";

/** A hat-trick's worth of goals is the bar; five is the pick of the season. */
const TIERS: readonly ThresholdTier[] = [
  { bar: 5, reward: 140 },
  { bar: 3, reward: 70 },
];
const PENALTY = 0;

/** La màquina: a team that puts three or more past its opponent. */
export const goalMachine: ChallengeDefinition = {
  slug: "goal_machine",
  targetKind: "team",
  reward: TIERS[0].reward,
  penalty: PENALTY,
  tiers: TIERS,
  score: (target, round) => {
    const picked = resolveTeamTarget(target, round);
    if (!picked) return null;
    return scoreAtLeast(picked.scored, TIERS);
  },
};
