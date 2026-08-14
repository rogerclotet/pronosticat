import {
  resolveTeamTarget,
  type ChallengeDefinition,
} from "@/lib/challenges/types";

const REWARD = 70;
const PENALTY = 0;

/** La sorpresa: an away team that wins. */
export const upset: ChallengeDefinition = {
  slug: "upset",
  targetKind: "team",
  requiredSide: "away",
  reward: REWARD,
  penalty: PENALTY,
  score: (target, round) => {
    const picked = resolveTeamTarget(target, round);
    if (!picked) return null;
    if (target.side !== "away") return PENALTY;

    return picked.scored > picked.conceded ? REWARD : PENALTY;
  },
};
