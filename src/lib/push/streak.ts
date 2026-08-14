/** Hits per settled matchday, newest first. A round with 0 hits breaks the run. */
export function roundHitStreak(
  roundsNewestFirst: readonly { hits: number }[],
): number {
  let streak = 0;
  for (const round of roundsNewestFirst) {
    if (round.hits > 0) streak += 1;
    else break;
  }
  return streak;
}

export function streakBroke(input: {
  hitsThisRound: number;
  previousStreak: number;
  minStreak: number;
}): boolean {
  return input.hitsThisRound <= 0 && input.previousStreak >= input.minStreak;
}
