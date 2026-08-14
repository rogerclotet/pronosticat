import { banker } from "@/lib/challenges/definitions/banker";
import { blank } from "@/lib/challenges/definitions/blank";
import { btts } from "@/lib/challenges/definitions/btts";
import { choke } from "@/lib/challenges/definitions/choke";
import { cleanSheet } from "@/lib/challenges/definitions/clean-sheet";
import { comeback } from "@/lib/challenges/definitions/comeback";
import { drawPick } from "@/lib/challenges/definitions/draw-pick";
import { exactScore } from "@/lib/challenges/definitions/exact-score";
import { goalFest } from "@/lib/challenges/definitions/goal-fest";
import { goalMachine } from "@/lib/challenges/definitions/goal-machine";
import { homeWins } from "@/lib/challenges/definitions/home-wins";
import { theBore } from "@/lib/challenges/definitions/the-bore";
import { thrashing } from "@/lib/challenges/definitions/thrashing";
import { totalGoalsRound } from "@/lib/challenges/definitions/total-goals";
import { upset } from "@/lib/challenges/definitions/upset";
import type { ChallengeDefinition } from "@/lib/challenges/types";

const CORE: readonly ChallengeDefinition[] = [
  exactScore,
  goalFest,
  thrashing,
  goalMachine,
  banker,
];

const ROTATING: readonly ChallengeDefinition[] = [
  theBore,
  upset,
  cleanSheet,
  blank,
  choke,
  drawPick,
  btts,
  comeback,
  totalGoalsRound,
  homeWins,
];

const ALL: readonly ChallengeDefinition[] = [...CORE, ...ROTATING];

export const CHALLENGES: Record<string, ChallengeDefinition> =
  Object.fromEntries(ALL.map((challenge) => [challenge.slug, challenge]));

/** The board every round gets, in display order. */
export const CORE_CHALLENGE_SLUGS = CORE.map((challenge) => challenge.slug);

/** One of these is added at random each round (deterministic per round id). */
export const EXTRA_CHALLENGE_SLUGS = ROTATING.map(
  (challenge) => challenge.slug,
);

export function getChallenge(slug: string): ChallengeDefinition | null {
  return CHALLENGES[slug] ?? null;
}
