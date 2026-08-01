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

export const POINTS = {
  EXACT_RESULT_MULTIPLIER: 3,
  OUTCOME_MULTIPLIER: 1,
  MIN_WAGER: 10,
  MAX_WAGER: 100,
  DEFAULT_STARTING: 1000,
} as const;

export function getOutcome(
  homeScore: number,
  awayScore: number,
): "home" | "draw" | "away" {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

export function calculatePointsAwarded(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  wager: number,
): number {
  const exactMatch =
    predictedHome === actualHome && predictedAway === actualAway;
  if (exactMatch) return wager * POINTS.EXACT_RESULT_MULTIPLIER;

  const predictedOutcome = getOutcome(predictedHome, predictedAway);
  const actualOutcome = getOutcome(actualHome, actualAway);
  if (predictedOutcome === actualOutcome) {
    return wager * POINTS.OUTCOME_MULTIPLIER;
  }
  return 0;
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateId(): string {
  return crypto.randomUUID();
}
