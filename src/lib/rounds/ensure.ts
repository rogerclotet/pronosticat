import { and, eq, min } from "drizzle-orm";
import { CORE_CHALLENGE_SLUGS } from "@/lib/challenges/registry";
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
    .select({
      matchday: matches.matchday,
      season: matches.season,
      firstKickoff: min(matches.kickoff),
    })
    .from(matches)
    .where(eq(matches.competition, competition))
    .groupBy(matches.season, matches.matchday);

  const now = new Date();

  // One read for the whole competition instead of a lookup per matchday: most
  // ticks find every round already built and settled, and do nothing at all.
  const existingRounds = await db.query.rounds.findMany({
    where: eq(rounds.competition, competition),
    columns: {
      id: true,
      lockAt: true,
      status: true,
      season: true,
      matchday: true,
    },
  });
  // Keyed on what identifies a round, not on its id: rounds created before
  // seasons existed still carry the old id scheme.
  const roundByMatchday = new Map(
    existingRounds.map((row) => [`${row.season}:${row.matchday}`, row]),
  );

  const existingSlots = await db
    .select({ roundId: roundChallenges.roundId, slug: roundChallenges.slug })
    .from(roundChallenges)
    .innerJoin(rounds, eq(rounds.id, roundChallenges.roundId))
    .where(eq(rounds.competition, competition));
  const slugsByRound = new Map<string, Set<string>>();
  for (const row of existingSlots) {
    const set = slugsByRound.get(row.roundId);
    if (set) set.add(row.slug);
    else slugsByRound.set(row.roundId, new Set([row.slug]));
  }

  for (const { matchday, season, firstKickoff } of matchdays) {
    if (!firstKickoff) continue;
    const lockAt = new Date(firstKickoff);
    const known = roundByMatchday.get(`${season}:${matchday}`);
    // Reuse the stored id when the round exists: it seeds the rotating slot.
    const id = known?.id ?? roundId(competition, season, matchday);

    // A round that is no longer open has a frozen deadline and a full board;
    // there is nothing left to reconcile for it.
    if (
      known &&
      known.status !== "open" &&
      (slugsByRound.get(id)?.size ?? 0) > CORE_CHALLENGE_SLUGS.length
    ) {
      continue;
    }

    if (!known) {
      await db
        .insert(rounds)
        .values({ id, competition, matchday, season, lockAt })
        .onConflictDoNothing({ target: rounds.id });
    }

    const openRound =
      known ??
      (await db.query.rounds.findFirst({
        where: eq(rounds.id, id),
        columns: { lockAt: true, status: true },
      }));
    const deadlineMoved =
      openRound?.status === "open" &&
      isMeaningfulDeadlineAdvance(openRound.lockAt, lockAt);

    // Fixtures move; the deadline follows them until the round locks. Writing
    // only on an actual move keeps the common no-op tick free of updates.
    if (
      openRound?.status === "open" &&
      openRound.lockAt.getTime() !== lockAt.getTime()
    ) {
      await db
        .update(rounds)
        .set({ lockAt, updatedAt: now })
        .where(and(eq(rounds.id, id), eq(rounds.status, "open")));
    }

    if (deadlineMoved) {
      try {
        await notifyDeadlineMoved({ roundId: id, competition, lockAt });
      } catch (error) {
        console.error("[push] deadline move notify failed:", error);
      }
    }

    const existingSlugs = slugsByRound.get(id) ?? new Set<string>();
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
