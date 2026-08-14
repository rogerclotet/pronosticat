import {
  type ChallengeDefinition,
  resolveTeamTarget,
} from "@/lib/challenges/types";

const REWARD = 40;
const PENALTY = -40;

/**
 * El segur: pick a team you are certain will win. Modest reward, symmetric
 * penalty — the slot that punishes greed rather than rewarding it.
 */
export const banker: ChallengeDefinition = {
  slug: "banker",
  targetKind: "team",
  reward: REWARD,
  penalty: PENALTY,
  score: (target, round) => {
    const picked = resolveTeamTarget(target, round);
    if (!picked) return null;

    return picked.scored > picked.conceded ? REWARD : PENALTY;
  },
};
