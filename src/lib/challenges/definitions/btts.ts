import {
  findTargetMatch,
  type ChallengeDefinition,
} from "@/lib/challenges/types";

const REWARD = 40;
const PENALTY = 0;

/** Marquen tots dos: both teams score. */
export const btts: ChallengeDefinition = {
  slug: "btts",
  targetKind: "match",
  reward: REWARD,
  penalty: PENALTY,
  score: (target, round) => {
    const match = findTargetMatch(target, round);
    if (!match) return null;

    return match.homeScore > 0 && match.awayScore > 0 ? REWARD : PENALTY;
  },
};
