import type { ChallengePayout, ThresholdTier } from "@/lib/challenges/types";

const MISS = 0;

/**
 * The payout ladder of a tiered challenge, one entry per bar. The bar doubles
 * as the copy key, so `challenges.<slug>.payout.<bar>` spells out the step.
 */
export function tierPayouts(
  tiers: readonly ThresholdTier[],
): readonly ChallengePayout[] {
  return tiers.map((tier) => ({ id: String(tier.bar), points: tier.reward }));
}

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
