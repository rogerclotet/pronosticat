"use client";

import { useTranslations } from "next-intl";
import { formatPoints } from "@/components/challenges/payouts";
import { cn } from "@/lib/utils";

type PointsChipProps = {
  /** `null` while the round is still waiting to be settled. */
  points: number | null;
  /** Picks stay hidden until the round locks. */
  masked?: boolean;
};

/**
 * What a pick paid, as read on a rival's sheet or the group board: the same
 * chip in both places so the two surfaces cannot drift apart.
 */
export function PointsChip({ points, masked = false }: PointsChipProps) {
  const t = useTranslations("board");

  const value = masked
    ? t("pointsMasked")
    : points === null
      ? t("pointsPending")
      : formatPoints(points);

  return (
    <span
      className={cn(
        "shrink-0 border-2 px-2 py-1.5 font-mono text-sm font-bold tabular-nums",
        masked || points === null
          ? "border-border text-muted"
          : points > 0
            ? "border-teal text-teal"
            : points < 0
              ? "border-danger text-danger"
              : "border-border-strong text-muted",
      )}
    >
      {value}
    </span>
  );
}
