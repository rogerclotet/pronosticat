"use server";

import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  entries,
  groupMembers,
  matches,
  rounds,
} from "@/lib/db/schema";
import { scoreEntry } from "@/lib/challenges/score";
import {
  isRoundSettleable,
  toResolvedMatches,
} from "@/lib/rounds/lifecycle";
import { ensureRounds } from "@/lib/rounds/ensure";
import { syncActiveCompetitions } from "@/lib/sync/run";

/** Reflect kickoffs in match status between syncs (and for dev fixtures). */
async function markKickedOffMatchesLive(now: Date) {
  await db
    .update(matches)
    .set({ status: "live", updatedAt: now })
    .where(and(eq(matches.status, "scheduled"), lte(matches.kickoff, now)));
}

/**
 * Close the board at the round's first kickoff. Nothing is charged here — the
 * slots are free, points only move at settlement.
 */
export async function lockOpenRounds() {
  const now = new Date();
  await markKickedOffMatchesLive(now);

  const due = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(and(eq(rounds.status, "open"), lte(rounds.lockAt, now)));

  for (const { id } of due) {
    await db.transaction(async (tx) => {
      const claimed = await tx
        .update(rounds)
        .set({ status: "locked", updatedAt: now })
        .where(and(eq(rounds.id, id), eq(rounds.status, "open")))
        .returning({ id: rounds.id });
      if (claimed.length === 0) return;

      await tx
        .update(entries)
        .set({ lockedAt: now, updatedAt: now })
        .where(and(eq(entries.roundId, id), isNull(entries.lockedAt)));
    });
  }
}

export async function settleLockedRounds() {
  const now = new Date();
  const locked = await db.query.rounds.findMany({
    where: eq(rounds.status, "locked"),
  });

  for (const round of locked) {
    const roundMatches = await db.query.matches.findMany({
      where: and(
        eq(matches.competition, round.competition),
        eq(matches.matchday, round.matchday),
      ),
    });
    if (!isRoundSettleable(roundMatches, now)) continue;

    await settleRound(round.id, toResolvedMatches(roundMatches), now);
  }
}

async function settleRound(
  id: string,
  resolved: ReturnType<typeof toResolvedMatches>,
  now: Date,
) {
  await db.transaction(async (tx) => {
    // Claiming the round first makes this row the mutex: a concurrent cron tick
    // blocks here, then finds the round settled and does nothing.
    const claimed = await tx
      .update(rounds)
      .set({ status: "settled", settledAt: now, updatedAt: now })
      .where(and(eq(rounds.id, id), eq(rounds.status, "locked")))
      .returning({ id: rounds.id });
    if (claimed.length === 0) return;

    const pending = await tx.query.entries.findMany({
      where: and(eq(entries.roundId, id), isNull(entries.pointsAwarded)),
      with: { roundChallenge: true },
    });

    const deltas = new Map<string, number>();

    for (const entry of pending) {
      const points = scoreEntry(
        entry.roundChallenge.slug,
        {
          matchId: entry.targetMatchId,
          side: entry.targetSide,
          predictedHome: entry.predictedHome,
          predictedAway: entry.predictedAway,
          numericValue: entry.numericValue,
          isJoker: entry.isJoker,
        },
        resolved,
      );

      // A void pick scores nothing rather than counting as a miss.
      await tx
        .update(entries)
        .set({ pointsAwarded: points ?? 0, updatedAt: now })
        .where(eq(entries.id, entry.id));

      if (points) {
        const key = `${entry.groupId}:${entry.userId}`;
        deltas.set(key, (deltas.get(key) ?? 0) + points);
      }
    }

    for (const [key, delta] of deltas) {
      const [groupId, userId] = key.split(":");
      await tx
        .update(groupMembers)
        .set({ points: sql`${groupMembers.points} + ${delta}` })
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, userId),
          ),
        );
    }
  });
}

export async function runScoreOnly() {
  await ensureRounds();
  await lockOpenRounds();
  await settleLockedRounds();
}

export async function runSyncAndScore() {
  await syncActiveCompetitions();
  await runScoreOnly();
}
