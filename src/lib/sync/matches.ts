import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { COMPETITIONS, type Competition } from "@/lib/constants";
import {
  fetchCompetitionMatches,
  mapMatchStatus,
} from "@/lib/football/api";

/** Upsert competition matches from the Football Data API. Safe to call during RSC render. */
export async function syncMatchesToDb(competition: Competition) {
  const config = COMPETITIONS[competition];
  const apiMatches = await fetchCompetitionMatches(config.footballDataCode);

  for (const m of apiMatches) {
    const id = `${competition}-${m.id}`;
    await db
      .insert(matches)
      .values({
        id,
        externalId: m.id,
        competition,
        homeTeam: m.homeTeam.shortName ?? m.homeTeam.name,
        awayTeam: m.awayTeam.shortName ?? m.awayTeam.name,
        homeTeamCrest: m.homeTeam.crest,
        awayTeamCrest: m.awayTeam.crest,
        homeScore: m.score.fullTime.home,
        awayScore: m.score.fullTime.away,
        matchday: m.matchday ?? 1,
        status: mapMatchStatus(m.status),
        kickoff: new Date(m.utcDate),
      })
      .onConflictDoUpdate({
        target: [matches.externalId, matches.competition],
        set: {
          homeScore: m.score.fullTime.home,
          awayScore: m.score.fullTime.away,
          status: mapMatchStatus(m.status),
          updatedAt: new Date(),
        },
      });
  }
}
