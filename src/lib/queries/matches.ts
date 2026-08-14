import "server-only";
import { and, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { type Competition, DATA_CACHE_TTL } from "@/lib/constants";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { getCurrentMatchdayFromDb } from "@/lib/queries/matchday";

type MatchRow = typeof matches.$inferSelect;

/** unstable_cache JSON-serializes values, turning Date fields into strings. */
function hydrateMatchDates(rows: MatchRow[]): MatchRow[] {
  return rows.map((row) => ({
    ...row,
    kickoff: new Date(row.kickoff),
    updatedAt: new Date(row.updatedAt),
  }));
}

/** Cron busts the "matches" tag after every sync, so the window is a backstop. */
const getCachedRoundMatches = unstable_cache(
  async (competition: Competition, matchday: number) =>
    db.query.matches.findMany({
      where: and(
        eq(matches.competition, competition),
        eq(matches.matchday, matchday),
      ),
      orderBy: [matches.kickoff],
    }),
  ["round-matches"],
  { revalidate: DATA_CACHE_TTL, tags: ["matches"] },
);

export async function getRoundMatches(
  competition: Competition,
  matchday: number,
) {
  return hydrateMatchDates(await getCachedRoundMatches(competition, matchday));
}

export async function getCurrentRoundMatches(competition: Competition) {
  const matchday = await getCurrentMatchdayFromDb(competition);
  return getRoundMatches(competition, matchday);
}
