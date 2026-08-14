import {
  type ChallengeDefinition,
  resolveTeamTarget,
} from "@/lib/challenges/types";

const REWARD = 60;
const PENALTY = 0;

/** Porteria a zero: a team that concedes zero. */
export const cleanSheet: ChallengeDefinition = {
  slug: "clean_sheet",
  targetKind: "team",
  reward: REWARD,
  penalty: PENALTY,
  score: (target, round) => {
    const picked = resolveTeamTarget(target, round);
    if (!picked) return null;

    return picked.conceded === 0 ? REWARD : PENALTY;
  },
};
