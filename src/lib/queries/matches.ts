import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { DATA_CACHE_TTL, type Competition } from "@/lib/constants";
import { getCurrentMatchdayFromDb } from "@/lib/queries/matchday";

/** Cron busts the "matches" tag after every sync, so the window is a backstop. */
async function getCachedRoundMatches(
  competition: Competition,
  matchday: number,
) {
  "use cache";
  cacheTag("matches");
  cacheLife({
    stale: DATA_CACHE_TTL,
    revalidate: DATA_CACHE_TTL,
    expire: 60 * 60,
  });

  return db.query.matches.findMany({
    where: and(
      eq(matches.competition, competition),
      eq(matches.matchday, matchday),
    ),
    orderBy: [matches.kickoff],
  });
}

export async function getRoundMatches(
  competition: Competition,
  matchday: number,
) {
  return getCachedRoundMatches(competition, matchday);
}

export async function getCurrentRoundMatches(competition: Competition) {
  const matchday = await getCurrentMatchdayFromDb(competition);
  return getRoundMatches(competition, matchday);
}
