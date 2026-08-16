import type { ChallengePayout } from "@/lib/challenges/types";

const EXACT = 100;
const NEAR_1 = 50;
const NEAR_2 = 20;
const PENALTY = 0;

/** How a round-wide numeric prediction pays, closest first. */
export const tieredNumberPayouts: readonly ChallengePayout[] = [
  { id: "exact", points: EXACT },
  { id: "off_by_1", points: NEAR_1 },
  { id: "off_by_2", points: NEAR_2 },
];

/** Shared tiering for round-wide numeric predictions. */
export function tieredNumberScore(predicted: number, actual: number): number {
  const diff = Math.abs(predicted - actual);
  if (diff === 0) return EXACT;
  if (diff === 1) return NEAR_1;
  if (diff === 2) return NEAR_2;
  return PENALTY;
}
