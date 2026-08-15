import "server-only";

import { and, asc, eq, isNotNull, max, sql } from "drizzle-orm";
import type { Competition } from "@/lib/constants";
import { db } from "@/lib/db";
import { entries, groupMembers, rounds, user } from "@/lib/db/schema";

export type PointsHistoryMember = { userId: string; name: string };

/** One settled matchday, with every member's running total at that point. */
export type PointsHistoryPoint = {
  matchday: number;
  totals: Record<string, number>;
};

export type PointsHistory = {
  season: number;
  members: PointsHistoryMember[];
  points: PointsHistoryPoint[];
};

/**
 * Each member's running total across the season's settled rounds, for the
 * standings chart. Totals are rebuilt from entries rather than read off
 * `group_members`, which only ever holds the present-day figure.
 */
export async function getPointsHistory(
  groupId: string,
  competition: Competition,
  startingPoints: number,
): Promise<PointsHistory | null> {
  const [latest] = await db
    .select({ season: max(rounds.season) })
    .from(rounds)
    .where(
      and(eq(rounds.competition, competition), eq(rounds.status, "settled")),
    );

  const season = latest?.season;
  if (season == null) return null;

  const [members, deltas] = await Promise.all([
    db
      .select({ userId: groupMembers.userId, name: user.name })
      .from(groupMembers)
      .innerJoin(user, eq(user.id, groupMembers.userId))
      .where(eq(groupMembers.groupId, groupId))
      .orderBy(asc(user.name)),

    db
      .select({
        matchday: rounds.matchday,
        userId: entries.userId,
        delta: sql<number>`coalesce(sum(${entries.pointsAwarded}), 0)`,
      })
      .from(entries)
      .innerJoin(rounds, eq(rounds.id, entries.roundId))
      .where(
        and(
          eq(entries.groupId, groupId),
          eq(rounds.season, season),
          eq(rounds.status, "settled"),
          isNotNull(entries.pointsAwarded),
        ),
      )
      .groupBy(rounds.matchday, entries.userId)
      .orderBy(asc(rounds.matchday)),
  ]);

  if (members.length === 0 || deltas.length === 0) return null;

  const deltaByMatchday = new Map<number, Map<string, number>>();
  for (const row of deltas) {
    const byUser = deltaByMatchday.get(row.matchday) ?? new Map();
    byUser.set(row.userId, Number(row.delta));
    deltaByMatchday.set(row.matchday, byUser);
  }

  const running = new Map(
    members.map((member) => [member.userId, startingPoints]),
  );

  // A member who sat a round out keeps their line flat rather than dropping off.
  const points = [...deltaByMatchday.keys()]
    .sort((a, b) => a - b)
    .map((matchday) => {
      const byUser = deltaByMatchday.get(matchday);
      const totals: Record<string, number> = {};
      for (const member of members) {
        const next =
          (running.get(member.userId) ?? startingPoints) +
          (byUser?.get(member.userId) ?? 0);
        running.set(member.userId, next);
        totals[member.userId] = next;
      }
      return { matchday, totals };
    });

  return { season, members, points };
}
