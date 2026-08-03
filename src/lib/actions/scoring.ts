"use server";

import { eq, and, lte, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, predictions, groupMembers } from "@/lib/db/schema";
import { calculatePointsAwarded } from "@/lib/constants";
import { syncActiveCompetitions } from "@/lib/sync/run";

export async function lockStartedPredictions() {
  const now = new Date();
  const startedMatches = await db.query.matches.findMany({
    where: and(eq(matches.status, "scheduled"), lte(matches.kickoff, now)),
  });

  for (const match of startedMatches) {
    await db
      .update(matches)
      .set({ status: "live", updatedAt: now })
      .where(eq(matches.id, match.id));

    const unlockedPreds = await db.query.predictions.findMany({
      where: and(
        eq(predictions.matchId, match.id),
        isNull(predictions.lockedAt),
      ),
    });

    for (const pred of unlockedPreds) {
      await db
        .update(predictions)
        .set({ lockedAt: now })
        .where(eq(predictions.id, pred.id));

      const member = await db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.userId, pred.userId),
          eq(groupMembers.groupId, pred.groupId),
        ),
      });

      if (member) {
        await db
          .update(groupMembers)
          .set({ points: member.points - pred.wager })
          .where(eq(groupMembers.id, member.id));
      }
    }
  }
}

export async function awardFinishedMatchPoints() {
  const finishedMatches = await db.query.matches.findMany({
    where: eq(matches.status, "finished"),
  });

  for (const match of finishedMatches) {
    if (match.homeScore === null || match.awayScore === null) continue;

    const preds = await db.query.predictions.findMany({
      where: and(
        eq(predictions.matchId, match.id),
        isNull(predictions.pointsAwarded),
      ),
    });

    for (const pred of preds) {
      const awarded = calculatePointsAwarded(
        pred.homeScore,
        pred.awayScore,
        match.homeScore,
        match.awayScore,
        pred.wager,
      );

      await db
        .update(predictions)
        .set({ pointsAwarded: awarded })
        .where(eq(predictions.id, pred.id));

      if (awarded > 0) {
        const member = await db.query.groupMembers.findFirst({
          where: and(
            eq(groupMembers.userId, pred.userId),
            eq(groupMembers.groupId, pred.groupId),
          ),
        });
        if (member) {
          await db
            .update(groupMembers)
            .set({ points: member.points + awarded })
            .where(eq(groupMembers.id, member.id));
        }
      }
    }
  }
}

export async function runSyncAndScore() {
  await syncActiveCompetitions();
  await lockStartedPredictions();
  await awardFinishedMatchPoints();
}
