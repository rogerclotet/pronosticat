import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, roundChallenges, rounds } from "@/lib/db/schema";
import { CORE_CHALLENGE_SLUGS, getChallenge } from "@/lib/challenges/registry";
import type { ChallengeTargetKind } from "@/lib/challenges/types";
import { ensureCompetitionRounds } from "@/lib/rounds/ensure";
import { getCurrentRound } from "@/lib/queries/matchday";
import { getRoundMatches } from "@/lib/queries/matches";
import { syncMatches } from "@/lib/sync/run";
import type { Competition } from "@/lib/constants";

async function hasCompetitionMatches(competition: Competition) {
  const row = await db.query.matches.findFirst({
    where: eq(matches.competition, competition),
    columns: { id: true },
  });
  return row != null;
}

export type BoardSlot = {
  id: string;
  slug: string;
  position: number;
  targetKind: ChallengeTargetKind;
  reward: number;
  penalty: number;
};

export type RoundBoard = {
  round: typeof rounds.$inferSelect;
  slots: BoardSlot[];
  matches: (typeof matches.$inferSelect)[];
};

async function loadSlots(roundId: string): Promise<BoardSlot[]> {
  const rows = await db.query.roundChallenges.findMany({
    where: eq(roundChallenges.roundId, roundId),
    orderBy: [asc(roundChallenges.position)],
  });

  // A slug the running code no longer knows about is dropped from the board
  // rather than rendered as a slot nobody can play.
  return rows.flatMap((row) => {
    const challenge = getChallenge(row.slug);
    if (!challenge) return [];
    return [
      {
        id: row.id,
        slug: row.slug,
        position: row.position,
        targetKind: challenge.targetKind,
        reward: challenge.reward,
        penalty: challenge.penalty,
      },
    ];
  });
}

/** The board being played right now, or null when no fixtures exist yet. */
export async function getCurrentRoundBoard(
  competition: Competition,
): Promise<RoundBoard | null> {
  let round = await getCurrentRound(competition);
  if (!round) {
    if (!(await hasCompetitionMatches(competition))) {
      await syncMatches(competition);
    }
    await ensureCompetitionRounds(competition);
    round = await getCurrentRound(competition);
  }
  if (!round) return null;

  const [initialSlots, roundMatches] = await Promise.all([
    loadSlots(round.id),
    getRoundMatches(competition, round.matchday),
  ]);
  let slots = initialSlots;

  // Rounds created before a slot was added to the board (or before the
  // rotating extra existed at all) are missing rows, not empty — top them up.
  if (slots.length < CORE_CHALLENGE_SLUGS.length + 1) {
    await ensureCompetitionRounds(competition);
    slots = await loadSlots(round.id);
  }

  return { round, slots, matches: roundMatches };
}

export async function getRoundBoardById(
  roundId: string,
): Promise<RoundBoard | null> {
  const round = await db.query.rounds.findFirst({
    where: eq(rounds.id, roundId),
  });
  if (!round) return null;

  const [slots, roundMatches] = await Promise.all([
    loadSlots(round.id),
    getRoundMatches(round.competition, round.matchday),
  ]);

  return { round, slots, matches: roundMatches };
}
