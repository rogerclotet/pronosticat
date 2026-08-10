"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sheet } from "@/components/ui/sheet";
import { StatTile } from "@/components/ui/stat-tile";
import { Pill } from "@/components/ui/pill";
import { getRoundBoardForClient, getUserEntries, getStandings } from "@/lib/actions/groups";
import { getRivalStats, getWeeklyDelta, type RivalStats } from "@/lib/actions/stats";
import {
  describePick,
  toBoardMatch,
  toEntryView,
  type BoardSlotView,
} from "@/components/challenges/types";
import type { Competition } from "@/lib/constants";

type RivalSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  competition: Competition;
  rivalUserId: string;
};

type RivalPick = {
  slug: string;
  slot: BoardSlotView;
  label: string | null;
  isJoker: boolean;
  pointsAwarded: number | null;
};

export function RivalSheet({
  isOpen,
  onClose,
  groupId,
  competition,
  rivalUserId,
}: RivalSheetProps) {
  const t = useTranslations("rival");
  const tChallenge = useTranslations("challenges");
  const tBoard = useTranslations("board");
  const [stats, setStats] = useState<RivalStats | null>(null);
  const [picks, setPicks] = useState<RivalPick[]>([]);
  const [round, setRound] = useState<number | null>(null);
  const [masked, setMasked] = useState(true);
  const [header, setHeader] = useState<{
    name: string;
    points: number;
    delta: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    (async () => {
      const [board, standings, rivalStats, delta] = await Promise.all([
        getRoundBoardForClient(competition),
        getStandings(groupId),
        getRivalStats(groupId, rivalUserId),
        getWeeklyDelta(rivalUserId, groupId),
      ]);
      if (cancelled) return;

      const rivalRow = standings.find((s) => s.userId === rivalUserId);
      setStats(rivalStats);
      setHeader({
        name: rivalRow?.name ?? "",
        points: rivalRow?.points ?? 0,
        delta,
      });

      if (!board) {
        setPicks([]);
        setRound(null);
        return;
      }

      const rivalEntries = await getUserEntries(
        rivalUserId,
        groupId,
        board.round.id,
      );
      if (cancelled) return;

      // Picks stay hidden until the round locks, so nobody can copy them.
      const hidePicks = board.round.status === "open";
      const boardMatches = board.matches.map(toBoardMatch);
      const entryBySlot = new Map(
        rivalEntries.map((e) => [e.roundChallengeId, toEntryView(e)]),
      );

      setMasked(hidePicks);
      setRound(board.round.matchday);
      setPicks(
        board.slots.flatMap((slot) => {
          const entry = entryBySlot.get(slot.id);
          if (!entry) return [];
          return [
            {
              slug: slot.slug,
              slot,
              label: hidePicks ? null : describePick(slot, entry, boardMatches),
              isJoker: entry.isJoker,
              pointsAwarded: entry.pointsAwarded,
            },
          ];
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, groupId, competition, rivalUserId]);

  if (!isOpen) return null;

  const deltaLabel = header
    ? header.delta >= 0
      ? `+${header.delta}`
      : `${header.delta}`
    : "";

  return (
    <Sheet
      title={header?.name ?? ""}
      subtitle={
        header ? t("meta", { points: header.points, delta: deltaLabel }) : undefined
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex">
          <StatTile label={t("hits")} value={stats?.hits ?? "–"} className="flex-1" />
          <StatTile
            label={t("jokers")}
            value={stats?.jokersLanded ?? "–"}
            accent="teal"
            className="-ml-0.5 flex-1"
          />
          <StatTile
            label={t("streak")}
            value={stats?.currentStreak ?? "–"}
            accent={stats && stats.currentStreak > 2 ? "teal" : "default"}
            className="-ml-0.5 flex-1"
          />
        </div>

        {round !== null && (
          <div className="border-b-2 border-border pb-2 font-sans text-[13.5px] font-extrabold uppercase">
            {t("predictionsTitle", { round })}
          </div>
        )}

        {picks.length === 0 ? (
          <p className="text-sm text-muted">{t("noPicks")}</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {picks.map((pick) => (
              <div
                key={pick.slug}
                className="flex items-center justify-between gap-2.5 border-2 border-border bg-surface p-2.5"
              >
                <div className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="font-sans text-[12.5px] font-semibold">
                      {tChallenge(`${pick.slug}.name`)}
                    </span>
                    {pick.isJoker && <Pill tone="teal">{tBoard("jokerBadge")}</Pill>}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                    {masked ? t("hidden") : (pick.label ?? "—")}
                  </span>
                </div>
                <div
                  className={
                    "border-2 px-2 py-1.5 font-mono text-sm font-bold " +
                    (masked
                      ? "border-border text-muted"
                      : "border-border-strong text-foreground")
                  }
                >
                  {masked
                    ? t("masked")
                    : pick.pointsAwarded === null
                      ? "·"
                      : pick.pointsAwarded > 0
                        ? `+${pick.pointsAwarded}`
                        : String(pick.pointsAwarded)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
