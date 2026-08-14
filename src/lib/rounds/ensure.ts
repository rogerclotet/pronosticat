import { and, eq, min } from "drizzle-orm";
import { boardChallengeSlugs } from "@/lib/challenges/rotating";
import type { Competition } from "@/lib/constants";
import { db } from "@/lib/db";
import { matches, roundChallenges, rounds } from "@/lib/db/schema";
import { notifyDeadlineMoved } from "@/lib/push/dispatch";
import { isMeaningfulDeadlineAdvance } from "@/lib/push/windows";
import { getActiveCompetitions } from "@/lib/queries/active-competitions";
import { roundId } from "@/lib/rounds/lifecycle";

/**
 * Create the round and its board of challenges for every matchday we have
 * fixtures for, and keep the deadline in step with the first kickoff while the
 * round is still open to picks.
 */
export async function ensureCompetitionRounds(competition: Competition) {
  const matchdays = await db
    .select({ matchday: matches.matchday, firstKickoff: min(matches.kickoff) })
    .from(matches)
    .where(eq(matches.competition, competition))
    .groupBy(matches.matchday);

  const now = new Date();

  for (const { matchday, firstKickoff } of matchdays) {
    if (!firstKickoff) continue;
    const lockAt = new Date(firstKickoff);
    const id = roundId(competition, matchday);

    await db
      .insert(rounds)
      .values({ id, competition, matchday, lockAt })
      .onConflictDoNothing({ target: rounds.id });

    const openRound = await db.query.rounds.findFirst({
      where: eq(rounds.id, id),
      columns: { lockAt: true, status: true },
    });
    const deadlineMoved =
      openRound?.status === "open" &&
      isMeaningfulDeadlineAdvance(openRound.lockAt, lockAt);

    // Fixtures move; the deadline follows them until the round locks.
    await db
      .update(rounds)
      .set({ lockAt, updatedAt: now })
      .where(and(eq(rounds.id, id), eq(rounds.status, "open")));

    if (deadlineMoved) {
      try {
        await notifyDeadlineMoved({ roundId: id, competition, lockAt });
      } catch (error) {
        console.error("[push] deadline move notify failed:", error);
      }
    }

    const existing = await db.query.roundChallenges.findMany({
      where: eq(roundChallenges.roundId, id),
      columns: { slug: true },
    });
    const existingSlugs = new Set(existing.map((row) => row.slug));
    const slugs = boardChallengeSlugs(id, existingSlugs);

    const toInsert = slugs
      .map((slug, position) => ({ slug, position }))
      .filter(({ slug }) => !existingSlugs.has(slug));

    if (toInsert.length > 0) {
      await db
        .insert(roundChallenges)
        .values(
          toInsert.map(({ slug, position }) => ({
            id: `${id}-${slug}`,
            roundId: id,
            slug,
            position,
          })),
        )
        .onConflictDoNothing({ target: roundChallenges.id });
    }
  }
}

export async function ensureRounds() {
  const competitions = await getActiveCompetitions();
  for (const competition of competitions) {
    await ensureCompetitionRounds(competition);
  }
}
