import {
  type ChallengeDefinition,
  resolveTeamTarget,
} from "@/lib/challenges/types";

const REWARD = 60;
const PENALTY = 0;

/** Es queden a zero: a team that fails to score. */
export const blank: ChallengeDefinition = {
  slug: "blank",
  targetKind: "team",
  reward: REWARD,
  penalty: PENALTY,
  score: (target, round) => {
    const picked = resolveTeamTarget(target, round);
    if (!picked) return null;

    return picked.scored === 0 ? REWARD : PENALTY;
  },
};
