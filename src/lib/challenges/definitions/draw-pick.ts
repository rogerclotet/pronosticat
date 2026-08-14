import {
  findTargetMatch,
  type ChallengeDefinition,
} from "@/lib/challenges/types";

const REWARD = 60;
const PENALTY = 0;

/** L'empat: a match that ends level. */
export const drawPick: ChallengeDefinition = {
  slug: "draw_pick",
  targetKind: "match",
  reward: REWARD,
  penalty: PENALTY,
  score: (target, round) => {
    const match = findTargetMatch(target, round);
    if (!match) return null;

    return match.homeScore === match.awayScore ? REWARD : PENALTY;
  },
};
