import { getChallenge } from "@/lib/challenges/registry";
import type { EntryTarget, ResolvedMatch } from "@/lib/challenges/types";
import { JOKER_MULTIPLIER } from "@/lib/constants";

export type ScorableEntry = EntryTarget & { isJoker: boolean };

/**
 * Points for one pick, joker included. `null` means the slot is void: an
 * unknown challenge, an empty round, or a target that was never played.
 */
export function scoreEntry(
  slug: string,
  entry: ScorableEntry,
  round: ResolvedMatch[],
): number | null {
  if (round.length === 0) return null;

  const challenge = getChallenge(slug);
  if (!challenge) return null;

  const points = challenge.score(entry, round);
  if (points === null) return null;

  return entry.isJoker ? points * JOKER_MULTIPLIER : points;
}
