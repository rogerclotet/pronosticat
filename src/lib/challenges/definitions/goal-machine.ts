import {
  type ChallengeDefinition,
  type ResolvedMatch,
  resolveTeamTarget,
} from "@/lib/challenges/types";

const REWARD = 80;
const PENALTY = 0;

function bestTeamTally(round: ResolvedMatch[]): number {
  return Math.max(
    ...round.flatMap((match) => [match.homeScore, match.awayScore]),
  );
}

/** La màquina: pick the top-scoring team of the round. Ties all win. */
export const goalMachine: ChallengeDefinition = {
  slug: "goal_machine",
  targetKind: "team",
  reward: REWARD,
  penalty: PENALTY,
  score: (target, round) => {
    const picked = resolveTeamTarget(target, round);
    if (!picked) return null;

    return picked.scored === bestTeamTally(round) ? REWARD : PENALTY;
  },
};
