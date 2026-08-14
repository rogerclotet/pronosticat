import { totalGoals } from "@/lib/challenges/definitions/goal-fest";
import {
  findTargetMatch,
  type ChallengeDefinition,
} from "@/lib/challenges/types";

const REWARD = 80;
const PENALTY = 0;

/** El rotllo: the match with the fewest total goals. Ties all win. */
export const theBore: ChallengeDefinition = {
  slug: "the_bore",
  targetKind: "match",
  reward: REWARD,
  penalty: PENALTY,
  score: (target, round) => {
    const match = findTargetMatch(target, round);
    if (!match) return null;

    const quietest = Math.min(...round.map(totalGoals));
    return totalGoals(match) === quietest ? REWARD : PENALTY;
  },
};
