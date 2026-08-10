import { tieredNumberScore } from "@/lib/challenges/definitions/tiered-number";
import type { ChallengeDefinition } from "@/lib/challenges/types";

/** Mando de casa: how many home wins in the round. */
export const homeWins: ChallengeDefinition = {
  slug: "home_wins",
  targetKind: "number",
  reward: 100,
  penalty: -20,
  score: (target, round) => {
    if (target.numericValue === null) return null;

    const actual = round.filter(
      (match) => match.homeScore > match.awayScore,
    ).length;
    return tieredNumberScore(target.numericValue, actual);
  },
};
