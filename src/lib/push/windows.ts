const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const DEADLINE_WINDOWS = [
  { id: "1h", ms: 1 * HOUR_MS },
  { id: "6h", ms: 6 * HOUR_MS },
] as const;

export type DeadlineWindowId = (typeof DEADLINE_WINDOWS)[number]["id"];

/** How far back a cron tick looks for newly finished matches / settled rounds. */
export const PUSH_LOOKBACK_MS = 25 * 60 * 1000;

/** "The board is ready" only fires once the jornada is actually approaching. */
export const ROUND_OPEN_MAX_MS = 7 * DAY_MS;

/** Ignore tiny kickoff reshuffles; 30 min is a real deadline move. */
export const DEADLINE_MOVED_MIN_MS = 30 * 60 * 1000;

export const STREAK_MILESTONES = [3, 5, 8] as const;

export const TITLE_RACE_REMAINING = new Set([1, 2]);

export const LIVE_SWING_SLUGS = new Set([
  "banker",
  "goal_machine",
  "thrashing",
]);

export const HALF_TIME_SLUGS = new Set(["exact_score", "comeback"]);

/**
 * The tightest window that still contains `lockAt`. Cron ticks inside a window
 * reuse the same id, so the unique dispatch row prevents repeats.
 */
export function matchingDeadlineWindow(
  lockAt: Date,
  now: Date,
): DeadlineWindowId | null {
  const remaining = lockAt.getTime() - now.getTime();
  if (remaining <= 0) return null;
  for (const window of DEADLINE_WINDOWS) {
    if (remaining <= window.ms) return window.id;
  }
  return null;
}

export function isRoundOpenWindow(lockAt: Date, now: Date): boolean {
  const remaining = lockAt.getTime() - now.getTime();
  if (remaining <= 0) return false;
  if (matchingDeadlineWindow(lockAt, now)) return false;
  return remaining <= ROUND_OPEN_MAX_MS;
}

export function isMeaningfulDeadlineAdvance(
  previousLockAt: Date,
  nextLockAt: Date,
): boolean {
  return (
    previousLockAt.getTime() - nextLockAt.getTime() >= DEADLINE_MOVED_MIN_MS
  );
}
