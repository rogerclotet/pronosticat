import type { ThresholdTier } from "@/lib/challenges/types";

const MISS = 0;

/**
 * Payout for a "clear the bar" challenge where a bigger value is better.
 * Tiers are declared hardest-first; the first bar the value clears pays.
 */
export function scoreAtLeast(
  value: number,
  tiers: readonly ThresholdTier[],
): number {
  return tiers.find((tier) => value >= tier.bar)?.reward ?? MISS;
}

/** As {@link scoreAtLeast}, for challenges where a smaller value is better. */
export function scoreAtMost(
  value: number,
  tiers: readonly ThresholdTier[],
): number {
  return tiers.find((tier) => value <= tier.bar)?.reward ?? MISS;
}
