import {
  resolveTeamTarget,
  type ChallengeDefinition,
} from "@/lib/challenges/types";

const REWARD = 50;
const PENALTY = -20;

/** El pringat: a team that loses. */
export const choke: ChallengeDefinition = {
  slug: "choke",
  targetKind: "team",
  reward: REWARD,
  penalty: PENALTY,
  score: (target, round) => {
    const picked = resolveTeamTarget(target, round);
    if (!picked) return null;

    return picked.scored < picked.conceded ? REWARD : PENALTY;
  },
};
