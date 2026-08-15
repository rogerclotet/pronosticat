import { sql } from "drizzle-orm";
import { COMPETITIONS, type Competition } from "@/lib/constants";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { fetchCompetitionMatches, mapMatchStatus } from "@/lib/football/api";

const UPSERT_CHUNK = 100;

/**
 * The API returns the whole season on every sync, but almost nothing changes
 * between ticks. Without this guard every row's `updatedAt` moves each time,
 * which makes the "what changed since the last tick" push queries match every
 * match ever played.
 */
const CHANGED_COLUMNS = sql`
  ${matches.homeScore} is distinct from excluded.home_score
  or ${matches.awayScore} is distinct from excluded.away_score
  or ${matches.homeScoreHt} is distinct from excluded.home_score_ht
  or ${matches.awayScoreHt} is distinct from excluded.away_score_ht
  or ${matches.matchday} is distinct from excluded.matchday
  or ${matches.status} is distinct from excluded.status
  or ${matches.kickoff} is distinct from excluded.kickoff
  or ${matches.homeTeam} is distinct from excluded.home_team
  or ${matches.awayTeam} is distinct from excluded.away_team
  or ${matches.homeTeamCrest} is distinct from excluded.home_team_crest
  or ${matches.awayTeamCrest} is distinct from excluded.away_team_crest
`;

/** Upsert competition matches from the Football Data API. */
export async function syncMatchesToDb(competition: Competition) {
  const config = COMPETITIONS[competition];
  const apiMatches = await fetchCompetitionMatches(config.footballDataCode);
  if (apiMatches.length === 0) return;

  const now = new Date();
  const rows = apiMatches.map((m) => {
    const live = {
      homeScore: m.score.fullTime.home,
      awayScore: m.score.fullTime.away,
      homeScoreHt: m.score.halfTime?.home ?? null,
      awayScoreHt: m.score.halfTime?.away ?? null,
      matchday: m.matchday ?? 1,
      status: mapMatchStatus(m.status),
      kickoff: new Date(m.utcDate),
    };

    return {
      id: `${competition}-${m.id}`,
      externalId: m.id,
      competition,
      homeTeam: m.homeTeam.shortName ?? m.homeTeam.name,
      awayTeam: m.awayTeam.shortName ?? m.awayTeam.name,
      homeTeamCrest: m.homeTeam.crest,
      awayTeamCrest: m.awayTeam.crest,
      ...live,
    };
  });

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    await db
      .insert(matches)
      .values(chunk)
      .onConflictDoUpdate({
        target: [matches.externalId, matches.competition],
        set: {
          homeScore: sql`excluded.home_score`,
          awayScore: sql`excluded.away_score`,
          homeScoreHt: sql`excluded.home_score_ht`,
          awayScoreHt: sql`excluded.away_score_ht`,
          matchday: sql`excluded.matchday`,
          status: sql`excluded.status`,
          kickoff: sql`excluded.kickoff`,
          homeTeam: sql`excluded.home_team`,
          awayTeam: sql`excluded.away_team`,
          homeTeamCrest: sql`excluded.home_team_crest`,
          awayTeamCrest: sql`excluded.away_team_crest`,
          updatedAt: now,
        },
        setWhere: CHANGED_COLUMNS,
      });
  }
}
