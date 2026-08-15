import "server-only";

import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import type { Competition } from "@/lib/constants";
import { db } from "@/lib/db";
import { entries, rounds, user } from "@/lib/db/schema";
import { competitionRanks } from "@/lib/ranking";

export type ArchiveStanding = {
  userId: string;
  name: string;
  points: number;
  hits: number;
  rank: number;
};

export type ArchiveRound = {
  roundId: string;
  matchday: number;
  settledAt: Date | null;
  picks: number;
  hits: number;
  netDelta: number;
};

export type ArchiveSeason = {
  season: number;
  standings: ArchiveStanding[];
  rounds: ArchiveRound[];
};

/**
 * Group points are cumulative across seasons, so a season's table is rebuilt
 * from the entries settled inside it rather than read off `group_members`.
 * Only settled rounds appear: a season in progress shows what it has so far.
 */
export async function getSeasonArchive(
  groupId: string,
  competition: Competition,
  viewerId: string,
): Promise<ArchiveSeason[]> {
  const [standingRows, roundRows] = await Promise.all([
    db
      .select({
        season: rounds.season,
        userId: entries.userId,
        name: user.name,
        points: sql<number>`coalesce(sum(${entries.pointsAwarded}), 0)`,
        hits: count(sql`case when ${entries.pointsAwarded} > 0 then 1 end`),
      })
      .from(entries)
      .innerJoin(rounds, eq(rounds.id, entries.roundId))
      .innerJoin(user, eq(user.id, entries.userId))
      .where(
        and(
          eq(entries.groupId, groupId),
          eq(rounds.status, "settled"),
          isNotNull(entries.pointsAwarded),
        ),
      )
      .groupBy(rounds.season, entries.userId, user.name),

    db
      .select({
        season: rounds.season,
        matchday: rounds.matchday,
        roundId: rounds.id,
        settledAt: rounds.settledAt,
        picks: count(entries.id),
        hits: count(sql`case when ${entries.pointsAwarded} > 0 then 1 end`),
        netDelta: sql<number>`coalesce(sum(${entries.pointsAwarded}), 0)`,
      })
      .from(rounds)
      // Left join so a round the viewer sat out still shows in the archive.
      .leftJoin(
        entries,
        and(
          eq(entries.roundId, rounds.id),
          eq(entries.groupId, groupId),
          eq(entries.userId, viewerId),
        ),
      )
      .where(
        and(eq(rounds.competition, competition), eq(rounds.status, "settled")),
      )
      .groupBy(rounds.season, rounds.matchday, rounds.id, rounds.settledAt)
      .orderBy(desc(rounds.season), desc(rounds.matchday)),
  ]);

  const seasons = new Map<number, ArchiveSeason>();
  const seasonOf = (season: number): ArchiveSeason => {
    const found = seasons.get(season);
    if (found) return found;
    const created: ArchiveSeason = { season, standings: [], rounds: [] };
    seasons.set(season, created);
    return created;
  };

  for (const row of standingRows) {
    seasonOf(row.season).standings.push({
      userId: row.userId,
      name: row.name,
      points: Number(row.points),
      hits: Number(row.hits),
      rank: 0,
    });
  }

  for (const row of roundRows) {
    seasonOf(row.season).rounds.push({
      roundId: row.roundId,
      matchday: row.matchday,
      settledAt: row.settledAt,
      picks: Number(row.picks),
      hits: Number(row.hits),
      netDelta: Number(row.netDelta),
    });
  }

  for (const season of seasons.values()) {
    const ranks = competitionRanks(season.standings);
    for (const standing of season.standings) {
      standing.rank = ranks.get(standing.userId) ?? 0;
    }
    season.standings.sort(
      (a, b) => a.rank - b.rank || a.name.localeCompare(b.name),
    );
  }

  return [...seasons.values()].sort((a, b) => b.season - a.season);
}
