import { and, count, desc, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries, rounds } from "@/lib/db/schema";
import { getChallenge } from "@/lib/challenges/registry";
import { JOKER_MULTIPLIER } from "@/lib/constants";
import { getMemberPoints } from "@/lib/queries/groups";

export type PendingStake = {
  picks: number;
  bestCase: number;
  worstCase: number;
};

/**
 * What the picks already made but not yet settled are worth. Slots cost
 * nothing to play, so the number that matters is the swing they carry.
 */
export async function getPendingStake(
  userId: string,
  groupId: string,
): Promise<PendingStake> {
  const pending = await db.query.entries.findMany({
    where: and(
      eq(entries.userId, userId),
      eq(entries.groupId, groupId),
      isNull(entries.pointsAwarded),
    ),
    with: { roundChallenge: true },
  });

  return pending.reduce<PendingStake>(
    (acc, entry) => {
      const challenge = getChallenge(entry.roundChallenge.slug);
      if (!challenge) return acc;
      const multiplier = entry.isJoker ? JOKER_MULTIPLIER : 1;
      return {
        picks: acc.picks + 1,
        bestCase: acc.bestCase + challenge.reward * multiplier,
        worstCase: acc.worstCase + challenge.penalty * multiplier,
      };
    },
    { picks: 0, bestCase: 0, worstCase: 0 },
  );
}

export async function getWeeklyDelta(
  userId: string,
  groupId: string,
): Promise<number> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${entries.pointsAwarded}), 0)`,
    })
    .from(entries)
    .innerJoin(rounds, eq(entries.roundId, rounds.id))
    .where(
      and(
        eq(entries.userId, userId),
        eq(entries.groupId, groupId),
        isNotNull(entries.pointsAwarded),
        gte(rounds.settledAt, since),
      ),
    );
  return Number(row?.total ?? 0);
}

export async function getProfileSummary(userId: string, groupId: string) {
  const [balance, pending, weeklyDelta] = await Promise.all([
    getMemberPoints(userId, groupId),
    getPendingStake(userId, groupId),
    getWeeklyDelta(userId, groupId),
  ]);
  return { balance, pending, weeklyDelta };
}

export type MatchdayHistoryRow = {
  matchday: number;
  picks: number;
  hits: number;
  misses: number;
  netDelta: number;
};

export async function getMatchdayHistory(
  userId: string,
  groupId: string,
): Promise<MatchdayHistoryRow[]> {
  const rows = await db
    .select({
      matchday: rounds.matchday,
      picks: count(entries.id),
      hits: count(sql`case when ${entries.pointsAwarded} > 0 then 1 end`),
      misses: count(sql`case when ${entries.pointsAwarded} <= 0 then 1 end`),
      netDelta: sql<number>`coalesce(sum(${entries.pointsAwarded}), 0)`,
    })
    .from(entries)
    .innerJoin(rounds, eq(entries.roundId, rounds.id))
    .where(
      and(
        eq(entries.userId, userId),
        eq(entries.groupId, groupId),
        isNotNull(entries.pointsAwarded),
      ),
    )
    .groupBy(rounds.matchday)
    .orderBy(desc(rounds.matchday));

  return rows.map((row) => ({ ...row, netDelta: Number(row.netDelta) }));
}

export type RivalStats = {
  hits: number;
  jokersLanded: number;
  currentStreak: number;
};

export async function getRivalStats(
  groupId: string,
  rivalUserId: string,
): Promise<RivalStats> {
  const settled = await db.query.entries.findMany({
    where: and(
      eq(entries.userId, rivalUserId),
      eq(entries.groupId, groupId),
      isNotNull(entries.pointsAwarded),
    ),
    with: { round: true },
    orderBy: [desc(entries.updatedAt)],
    limit: 60,
  });

  const hits = settled.filter((e) => (e.pointsAwarded ?? 0) > 0).length;
  const jokersLanded = settled.filter(
    (e) => e.isJoker && (e.pointsAwarded ?? 0) > 0,
  ).length;

  // Streak = consecutive winning picks from the most recent round backwards.
  const byRecency = settled
    .slice()
    .sort((a, b) => b.round.matchday - a.round.matchday);

  let currentStreak = 0;
  for (const entry of byRecency) {
    if ((entry.pointsAwarded ?? 0) > 0) currentStreak++;
    else break;
  }

  return { hits, jokersLanded, currentStreak };
}
