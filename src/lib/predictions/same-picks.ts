/** The fields that make two boards the same pick-for-pick, ignoring ids and timestamps. */
export type PickSnapshot = {
  roundChallengeId: string;
  targetMatchId: string | null;
  targetSide: string | null;
  predictedHome: number | null;
  predictedAway: number | null;
  numericValue: number | null;
  targetsJson: unknown;
  isJoker: boolean;
};

function pickKey(pick: PickSnapshot): string {
  return [
    pick.roundChallengeId,
    pick.targetMatchId ?? "",
    pick.targetSide ?? "",
    pick.predictedHome ?? "",
    pick.predictedAway ?? "",
    pick.numericValue ?? "",
    JSON.stringify(pick.targetsJson ?? null),
    pick.isJoker ? "1" : "0",
  ].join("\0");
}

/** True when both boards fill the same slots with the same targets and joker. */
export function samePicks(a: PickSnapshot[], b: PickSnapshot[]): boolean {
  if (a.length !== b.length) return false;
  const keys = new Set(a.map(pickKey));
  return b.every((pick) => keys.has(pickKey(pick)));
}
