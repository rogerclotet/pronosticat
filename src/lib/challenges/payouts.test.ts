import { describe, expect, it } from "vitest";
import { CHALLENGES } from "@/lib/challenges/registry";
import messages from "../../../messages/ca.json";

const copy = messages.challenges as Record<
  string,
  { payout?: Record<string, string> }
>;

describe.each(Object.values(CHALLENGES))("$slug payouts", (challenge) => {
  it("lists at least one way to score", () => {
    expect(challenge.payouts.length).toBeGreaterThan(0);
  });

  it("runs best first", () => {
    const points = challenge.payouts.map((payout) => payout.points);
    expect(points).toEqual([...points].sort((a, b) => b - a));
  });

  it("agrees with the reward and penalty the projections use", () => {
    const points = challenge.payouts.map((payout) => payout.points);
    expect(challenge.reward).toBe(Math.max(...points));
    expect(challenge.penalty).toBe(Math.min(0, ...points));
  });

  it("has copy for every outcome", () => {
    const payoutCopy = copy[challenge.slug]?.payout ?? {};
    for (const payout of challenge.payouts) {
      expect(payoutCopy[payout.id]).toBeTruthy();
    }
    expect(Object.keys(payoutCopy).sort()).toEqual(
      challenge.payouts.map((payout) => payout.id).sort(),
    );
  });
});
