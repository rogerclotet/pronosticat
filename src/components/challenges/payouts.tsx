"use client";

import { useTranslations } from "next-intl";
import type { ChallengePayout } from "@/lib/challenges/types";
import { cn } from "@/lib/utils";

/** Signed points, so a payout ladder reads as gains and losses at a glance. */
export function formatPoints(points: number): string {
  return points > 0 ? `+${points}` : String(points);
}

function payoutTone(points: number): string {
  if (points > 0) return "text-teal";
  return points < 0 ? "text-danger" : "text-muted";
}

/** The single payout a slot pays when it only has one way to hit. */
export function isSinglePayout(payouts: readonly ChallengePayout[]): boolean {
  return payouts.filter((payout) => payout.points > 0).length === 1;
}

type PayoutLadderProps = {
  slug: string;
  payouts: readonly ChallengePayout[];
  multiplier?: number;
};

/** Compact ladder for the slot card: what each result is worth, best first. */
export function CardPayouts({ slug, payouts }: PayoutLadderProps) {
  const tChallenge = useTranslations("challenges");

  if (payouts.length === 1) {
    return (
      <span
        className={cn(
          "relative font-mono text-[10px] font-bold tabular-nums",
          payoutTone(payouts[0].points),
        )}
      >
        {formatPoints(payouts[0].points)}
      </span>
    );
  }

  return (
    <ul className="relative flex flex-col gap-[3px]">
      {payouts.map((payout) => (
        <li key={payout.id} className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "w-8 shrink-0 text-right font-mono text-[10px] font-bold tabular-nums",
              payoutTone(payout.points),
            )}
          >
            {formatPoints(payout.points)}
          </span>
          <span className="min-w-0 font-sans text-[9.5px] leading-tight text-text-secondary">
            {tChallenge(`${slug}.payout.${payout.id}`)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The same ladder in the sheet, where there is room to spell it out. */
export function SheetPayouts({
  slug,
  payouts,
  multiplier = 1,
  label,
}: PayoutLadderProps & { label: string }) {
  const tChallenge = useTranslations("challenges");

  return (
    <div className="border-2 border-border bg-surface px-2 py-2.5">
      <ul className="flex flex-col gap-1.5">
        {payouts.map((payout) => (
          <li
            key={payout.id}
            className="flex items-baseline justify-between gap-2.5"
          >
            <span className="font-sans text-[11px] leading-snug text-text-secondary">
              {tChallenge(`${slug}.payout.${payout.id}`)}
            </span>
            <span
              className={cn(
                "font-mono text-lg font-bold tabular-nums",
                payoutTone(payout.points),
              )}
            >
              {formatPoints(payout.points * multiplier)}
            </span>
          </li>
        ))}
      </ul>
      <p className="label-mono mt-1.5">{label}</p>
    </div>
  );
}
