import { getOutcome } from "@/lib/constants";
import {
  findTargetMatch,
  type ChallengeDefinition,
} from "@/lib/challenges/types";

const EXACT_REWARD = 100;
const OUTCOME_REWARD = 25;
const PENALTY = -25;

/** El clàssic: pick a match and call its exact scoreline. */
export const exactScore: ChallengeDefinition = {
  slug: "exact_score",
  targetKind: "match_score",
  reward: EXACT_REWARD,
  penalty: PENALTY,
  score: (target, round) => {
    const match = findTargetMatch(target, round);
    if (!match) return null;
    if (target.predictedHome === null || target.predictedAway === null) {
      return null;
    }

    if (
      target.predictedHome === match.homeScore &&
      target.predictedAway === match.awayScore
    ) {
      return EXACT_REWARD;
    }

    const predicted = getOutcome(target.predictedHome, target.predictedAway);
    if (predicted === getOutcome(match.homeScore, match.awayScore)) {
      return OUTCOME_REWARD;
    }

    return PENALTY;
  },
};
