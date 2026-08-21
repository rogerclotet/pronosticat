import { and, asc, desc, eq, gt, inArray, lte, ne } from "drizzle-orm";
import { type Competition, seasonFromDate } from "@/lib/constants";
import { db } from "@/lib/db";
import { matches, rounds } from "@/lib/db/schema";

export type CurrentRound = typeof rounds.$inferSelect;

/**
 * The round currently in play: the earliest one still awaiting settlement.
 * Deliberately not derived from match status — between the last final whistle
 * and settlement the board must keep showing the round you are waiting on.
 */
export async function getCurrentRound(
  competition: Competition,
): Promise<CurrentRound | null> {
  const round = await db.query.rounds.findFirst({
    where: and(
      eq(rounds.competition, competition),
      ne(rounds.status, "settled"),
    ),
    orderBy: [asc(rounds.season), asc(rounds.matchday)],
  });

  return round ?? null;
}

/**
 * The round users are still allowed to submit picks for: open and before lock.
 * When the previous round is still awaiting settlement, this points at the
 * upcoming one so predictions stay available.
 */
export async function getRoundAcceptingPredictions(
  competition: Competition,
): Promise<CurrentRound | null> {
  const round = await db.query.rounds.findFirst({
    where: and(
      eq(rounds.competition, competition),
      eq(rounds.status, "open"),
      gt(rounds.lockAt, new Date()),
    ),
    orderBy: [asc(rounds.season), asc(rounds.matchday)],
  });

  return round ?? null;
}

/**
 * Every round that has already kicked off, newest first. The results screen
 * opens on the first of these and offers the rest through its selector.
 * Based on `lockAt` rather than status so a round shows up the moment its
 * first match starts, without waiting for the cron to mark it locked.
 */
export async function getStartedRounds(
  competition: Competition,
): Promise<CurrentRound[]> {
  return db.query.rounds.findMany({
    where: and(
      eq(rounds.competition, competition),
      lte(rounds.lockAt, new Date()),
    ),
    orderBy: [desc(rounds.season), desc(rounds.matchday)],
  });
}

/** Fallback for when no round row exists yet (fixtures synced, cron not run). */
export async function getCurrentMatchdayFromDb(
  competition: Competition,
): Promise<{ season: number; matchday: number }> {
  const [row] = await db
    .select({ season: matches.season, matchday: matches.matchday })
    .from(matches)
    .where(
      and(
        eq(matches.competition, competition),
        inArray(matches.status, ["scheduled", "live"]),
      ),
    )
    .orderBy(asc(matches.season), asc(matches.matchday))
    .limit(1);

  return row ?? { season: seasonFromDate(new Date()), matchday: 1 };
}
