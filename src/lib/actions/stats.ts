"use server";

import { eq, and, desc, gte, isNull, isNotNull, count, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, predictions } from "@/lib/db/schema";
import { POINTS } from "@/lib/constants";
import { getMemberPoints } from "./groups";

export async function getCommittedPoints(
  userId: string,
  groupId: string,
): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${predictions.wager}), 0)` })
    .from(predictions)
    .where(
      and(
        eq(predictions.userId, userId),
        eq(predictions.groupId, groupId),
        isNotNull(predictions.lockedAt),
        isNull(predictions.pointsAwarded),
      ),
    );
  return row?.total ?? 0;
}

export async function getWeeklyDelta(userId: string, groupId: string): Promise<number> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${predictions.pointsAwarded} - ${predictions.wager}), 0)`,
    })
    .from(predictions)
    .innerJoin(matches, eq(predictions.matchId, matches.id))
    .where(
      and(
        eq(predictions.userId, userId),
        eq(predictions.groupId, groupId),
        isNotNull(predictions.pointsAwarded),
        gte(matches.kickoff, since),
      ),
    );
  return row?.total ?? 0;
}

export async function getProfileSummary(userId: string, groupId: string) {
  const [balance, committedPoints, weeklyDelta] = await Promise.all([
    getMemberPoints(userId, groupId),
    getCommittedPoints(userId, groupId),
    getWeeklyDelta(userId, groupId),
  ]);
  return { balance, committedPoints, weeklyDelta };
}

export type MatchdayHistoryRow = {
  matchday: number;
  matchesPredicted: number;
  hit: number;
  partial: number;
  miss: number;
  netDelta: number;
};

export async function getMatchdayHistory(
  userId: string,
  groupId: string,
): Promise<MatchdayHistoryRow[]> {
  return db
    .select({
      matchday: matches.matchday,
      matchesPredicted: count(predictions.id),
      hit: sql<number>`count(case when ${predictions.pointsAwarded} >= ${predictions.wager} * ${POINTS.EXACT_RESULT_MULTIPLIER} then 1 end)`,
      partial: sql<number>`count(case when ${predictions.pointsAwarded} > 0 and ${predictions.pointsAwarded} < ${predictions.wager} * ${POINTS.EXACT_RESULT_MULTIPLIER} then 1 end)`,
      miss: sql<number>`count(case when ${predictions.pointsAwarded} = 0 then 1 end)`,
      netDelta: sql<number>`coalesce(sum(${predictions.pointsAwarded} - ${predictions.wager}), 0)`,
    })
    .from(predictions)
    .innerJoin(matches, eq(predictions.matchId, matches.id))
    .where(
      and(
        eq(predictions.userId, userId),
        eq(predictions.groupId, groupId),
        isNotNull(predictions.pointsAwarded),
      ),
    )
    .groupBy(matches.matchday)
    .orderBy(desc(matches.matchday));
}

export type RivalStats = {
  totalCorrect: number;
  exactResults: number;
  currentStreak: number;
};

export async function getRivalStats(
  groupId: string,
  rivalUserId: string,
): Promise<RivalStats> {
  const [agg] = await db
    .select({
      exactResults: sql<number>`count(case when ${predictions.pointsAwarded} >= ${predictions.wager} * ${POINTS.EXACT_RESULT_MULTIPLIER} then 1 end)`,
      correctOutcomes: sql<number>`count(case when ${predictions.pointsAwarded} > 0 and ${predictions.pointsAwarded} < ${predictions.wager} * ${POINTS.EXACT_RESULT_MULTIPLIER} then 1 end)`,
    })
    .from(predictions)
    .where(
      and(
        eq(predictions.userId, rivalUserId),
        eq(predictions.groupId, groupId),
        isNotNull(predictions.pointsAwarded),
      ),
    );

  const recent = await db.query.predictions.findMany({
    where: and(
      eq(predictions.userId, rivalUserId),
      eq(predictions.groupId, groupId),
      isNotNull(predictions.pointsAwarded),
    ),
    with: { match: true },
    limit: 30,
  });
  const sorted = recent
    .slice()
    .sort((a, b) => b.match.kickoff.getTime() - a.match.kickoff.getTime());

  let currentStreak = 0;
  for (const p of sorted) {
    if ((p.pointsAwarded ?? 0) > 0) currentStreak++;
    else break;
  }

  return {
    exactResults: agg?.exactResults ?? 0,
    totalCorrect: (agg?.exactResults ?? 0) + (agg?.correctOutcomes ?? 0),
    currentStreak,
  };
}
