import {
  findTargetMatch,
  type ChallengeDefinition,
  type ResolvedMatch,
} from "@/lib/challenges/types";

const REWARD = 80;
const PENALTY = -20;

export function totalGoals(match: ResolvedMatch): number {
  return match.homeScore + match.awayScore;
}

/** La golejada: pick the match of the round with the most goals. Ties all win. */
export const goalFest: ChallengeDefinition = {
  slug: "goal_fest",
  targetKind: "match",
  reward: REWARD,
  penalty: PENALTY,
  score: (target, round) => {
    const match = findTargetMatch(target, round);
    if (!match) return null;

    const best = Math.max(...round.map(totalGoals));
    return totalGoals(match) === best ? REWARD : PENALTY;
  },
};
