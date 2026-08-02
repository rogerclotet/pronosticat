import { unstable_cache } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { COMPETITIONS, DATA_CACHE_TTL, type Competition } from "@/lib/constants";
import { fetchCurrentMatchday } from "@/lib/football/api";
import { syncMatchesToDb } from "@/lib/sync/matches";

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

export async function getCurrentRoundMatches(competition: Competition) {
  try {
    const config = COMPETITIONS[competition];
    const matchday = await fetchCurrentMatchday(config.footballDataCode);

    let roundMatches = await getCachedRoundMatches(competition, matchday);

    if (roundMatches.length === 0) {
      await syncMatchesToDb(competition);
      roundMatches = await db.query.matches.findMany({
        where: and(
          eq(matches.competition, competition),
          eq(matches.matchday, matchday),
        ),
        orderBy: [matches.kickoff],
      });
    }

    return roundMatches;
  } catch (error) {
    console.error("[pronosticat] getCurrentRoundMatches failed:", error);
    throw error;
  }
}

export async function getCurrentMatchday(competition: Competition) {
  const config = COMPETITIONS[competition];
  return fetchCurrentMatchday(config.footballDataCode);
}
