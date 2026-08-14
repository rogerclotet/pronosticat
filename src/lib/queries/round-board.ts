import { asc, eq } from "drizzle-orm";
import { CORE_CHALLENGE_SLUGS, getChallenge } from "@/lib/challenges/registry";
import type { ChallengeTargetKind, TargetSide } from "@/lib/challenges/types";
import type { Competition } from "@/lib/constants";
import { db } from "@/lib/db";
import { matches, roundChallenges, type rounds } from "@/lib/db/schema";
import { getCurrentRound } from "@/lib/queries/matchday";
import { getRoundMatches } from "@/lib/queries/matches";
import { ensureCompetitionRounds } from "@/lib/rounds/ensure";

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
  requiredSide?: TargetSide;
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
        requiredSide: challenge.requiredSide,
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
    // Page renders must not call football-data.org: that burns quota, can wait
    // on 429s, and lets any logged-in user trigger an outbound sync.
    if (!(await hasCompetitionMatches(competition))) {
      return null;
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
