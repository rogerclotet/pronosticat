import {
  type ChallengeDefinition,
  findTargetMatch,
} from "@/lib/challenges/types";
import { getOutcome } from "@/lib/constants";

const EXACT_REWARD = 100;
const OUTCOME_REWARD = 25;
const PENALTY = -25;

/** La porra: pick a match and call its exact scoreline. */
export const exactScore: ChallengeDefinition = {
  slug: "exact_score",
  targetKind: "match_score",
  reward: EXACT_REWARD,
  penalty: PENALTY,
  payouts: [
    { id: "exact", points: EXACT_REWARD },
    { id: "outcome", points: OUTCOME_REWARD },
    { id: "miss", points: PENALTY },
  ],
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
