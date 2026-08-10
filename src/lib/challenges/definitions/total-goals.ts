import { totalGoals } from "@/lib/challenges/definitions/goal-fest";
import { tieredNumberScore } from "@/lib/challenges/definitions/tiered-number";
import type { ChallengeDefinition } from "@/lib/challenges/types";

/** El comptador: total goals across the whole round. */
export const totalGoalsRound: ChallengeDefinition = {
  slug: "total_goals",
  targetKind: "number",
  reward: 100,
  penalty: -20,
  score: (target, round) => {
    if (target.numericValue === null) return null;

    const actual = round.reduce((sum, match) => sum + totalGoals(match), 0);
    return tieredNumberScore(target.numericValue, actual);
  },
};
