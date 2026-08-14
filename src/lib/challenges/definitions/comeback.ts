import {
  type ChallengeDefinition,
  findTargetMatch,
} from "@/lib/challenges/types";

const REWARD = 90;
const PENALTY = 0;

/** La remuntada: the side losing at half-time does not lose at full-time. */
export const comeback: ChallengeDefinition = {
  slug: "comeback",
  targetKind: "match",
  reward: REWARD,
  penalty: PENALTY,
  score: (target, round) => {
    const match = findTargetMatch(target, round);
    if (!match || match.homeScoreHt === null || match.awayScoreHt === null) {
      return null;
    }

    if (match.homeScoreHt === match.awayScoreHt) return PENALTY;

    const homeWasLosing = match.homeScoreHt < match.awayScoreHt;
    const awayWasLosing = match.awayScoreHt < match.homeScoreHt;
    const homeDidNotLose = match.homeScore >= match.awayScore;
    const awayDidNotLose = match.awayScore >= match.homeScore;

    const hit =
      (homeWasLosing && homeDidNotLose) || (awayWasLosing && awayDidNotLose);
    return hit ? REWARD : PENALTY;
  },
};
