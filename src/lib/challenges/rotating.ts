import { createHash } from "node:crypto";
import {
  CORE_CHALLENGE_SLUGS,
  EXTRA_CHALLENGE_SLUGS,
} from "@/lib/challenges/registry";

/** Stable extra for a round — same slug every time that round is ensured. */
export function pickRotatingChallenge(roundId: string): string {
  const hash = createHash("sha256").update(roundId).digest();
  const index = hash.readUInt32BE(0) % EXTRA_CHALLENGE_SLUGS.length;
  return EXTRA_CHALLENGE_SLUGS[index];
}

/** Core slots plus the rotating extra already on the board, or a new pick. */
export function boardChallengeSlugs(
  roundId: string,
  existingSlugs: ReadonlySet<string>,
): readonly string[] {
  const rotating = EXTRA_CHALLENGE_SLUGS.find((slug) =>
    existingSlugs.has(slug),
  );
  if (rotating) return [...CORE_CHALLENGE_SLUGS, rotating];
  return [...CORE_CHALLENGE_SLUGS, pickRotatingChallenge(roundId)];
}
