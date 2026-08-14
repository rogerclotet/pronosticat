export type Competition = "laliga" | "premier_league" | "champions_league";

export const COMPETITIONS: Record<
  Competition,
  { code: string; footballDataCode: string; matchdayCount: number }
> = {
  laliga: { code: "laliga", footballDataCode: "PD", matchdayCount: 38 },
  premier_league: {
    code: "premier_league",
    footballDataCode: "PL",
    matchdayCount: 38,
  },
  champions_league: {
    code: "champions_league",
    footballDataCode: "CL",
    matchdayCount: 13,
  },
};

/** Server cache TTL in seconds for round fixtures. Cron revalidateTag busts this. */
export const DATA_CACHE_TTL = 60;

export const POINTS = {
  DEFAULT_STARTING: 0,
} as const;

/** The joker doubles both the reward and the penalty of the pick it is attached to. */
export const JOKER_MULTIPLIER = 2;

/**
 * A round normally settles once every match is finished. Postponements would
 * otherwise freeze the board forever, so after this grace period past the last
 * kickoff the round settles with whatever was actually played.
 */
export const ROUND_SETTLE_GRACE_HOURS = 48;

/** Upper bound for a predicted scoreline, so a crafted payload can't store nonsense. */
export const MAX_PREDICTED_SCORE = 20;

/** Upper bound for numeric challenges (e.g. total goals in a round). */
export const MAX_NUMERIC_VALUE = 99;

export function getOutcome(
  homeScore: number,
  awayScore: number,
): "home" | "draw" | "away" {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

export function generateId(): string {
  return crypto.randomUUID();
}
