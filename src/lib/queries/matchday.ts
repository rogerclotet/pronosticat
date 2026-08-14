import { and, asc, eq, inArray, min, ne } from "drizzle-orm";
import type { Competition } from "@/lib/constants";
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
    orderBy: [asc(rounds.matchday)],
  });

  return round ?? null;
}

/** Fallback for when no round row exists yet (fixtures synced, cron not run). */
export async function getCurrentMatchdayFromDb(
  competition: Competition,
): Promise<number> {
  const [row] = await db
    .select({ matchday: min(matches.matchday) })
    .from(matches)
    .where(
      and(
        eq(matches.competition, competition),
        inArray(matches.status, ["scheduled", "live"]),
      ),
    );

  return row?.matchday ?? 1;
}
