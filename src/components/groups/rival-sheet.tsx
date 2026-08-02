"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sheet } from "@/components/ui/sheet";
import { StatTile } from "@/components/ui/stat-tile";
import {
  getCurrentRoundMatches,
  getUserPredictions,
  getStandings,
} from "@/lib/actions/groups";
import { getRivalStats, getWeeklyDelta, type RivalStats } from "@/lib/actions/stats";
import type { Competition } from "@/lib/constants";

type RivalSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  competition: Competition;
  rivalUserId: string;
};

type RoundPred = {
  matchId: string;
  home: string;
  away: string;
  meta: string;
  open: boolean;
  homeScore: number;
  awayScore: number;
};

export function RivalSheet({
  isOpen,
  onClose,
  groupId,
  competition,
  rivalUserId,
}: RivalSheetProps) {
  const t = useTranslations("rival");
  const tMatch = useTranslations("match");
  const [stats, setStats] = useState<RivalStats | null>(null);
  const [preds, setPreds] = useState<RoundPred[]>([]);
  const [round, setRound] = useState<number | null>(null);
  const [header, setHeader] = useState<{ name: string; points: number; delta: number } | null>(
    null,
  );

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    (async () => {
      const [matches, standings, rivalStats, delta] = await Promise.all([
        getCurrentRoundMatches(competition),
        getStandings(groupId),
        getRivalStats(groupId, rivalUserId),
        getWeeklyDelta(rivalUserId, groupId),
      ]);
      const userPreds = await getUserPredictions(
        rivalUserId,
        groupId,
        matches.map((m) => m.id),
      );
      const predMap = new Map(userPreds.map((p) => [p.matchId, p]));
      const rows = matches.map((m) => {
        const p = predMap.get(m.id);
        const open = m.status === "scheduled";
        return {
          matchId: m.id,
          home: m.homeTeam,
          away: m.awayTeam,
          meta: open ? t("hidden") : tMatch(m.status),
          open,
          homeScore: p?.homeScore ?? -1,
          awayScore: p?.awayScore ?? -1,
        };
      });
      const rivalRow = standings.find((s) => s.userId === rivalUserId);

      if (!cancelled) {
        setPreds(rows.filter((r) => predMap.has(r.matchId) || r.open));
        setRound(matches[0]?.matchday ?? null);
        setStats(rivalStats);
        setHeader({ name: rivalRow?.name ?? "", points: rivalRow?.points ?? 0, delta });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, groupId, competition, rivalUserId, t, tMatch]);

  if (!isOpen) return null;

  const deltaLabel = header ? (header.delta >= 0 ? `+${header.delta}` : `${header.delta}`) : "";

  return (
    <Sheet
      title={header?.name ?? ""}
      subtitle={header ? t("meta", { points: header.points, delta: deltaLabel }) : undefined}
      onClose={onClose}
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex">
          <StatTile
            label={t("totalCorrect")}
            value={stats?.totalCorrect ?? "–"}
            className="flex-1 -ml-0.5 first:ml-0"
          />
          <StatTile
            label={t("exactResults")}
            value={stats?.exactResults ?? "–"}
            accent="teal"
            className="flex-1 -ml-0.5"
          />
          <StatTile
            label={t("streak")}
            value={stats?.currentStreak ?? "–"}
            accent={stats && stats.currentStreak > 2 ? "teal" : "default"}
            className="flex-1 -ml-0.5"
          />
        </div>

        {round !== null && (
          <div className="border-b-2 border-border pb-2 font-sans text-[13.5px] font-extrabold uppercase">
            {t("predictionsTitle", { round })}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {preds.map((p) => (
            <div
              key={p.matchId}
              className="flex items-center justify-between gap-2.5 border-2 border-border bg-surface p-2.5"
            >
              <div className="flex flex-col gap-1.5">
                <span className="font-sans text-[12.5px] font-semibold">
                  {p.home} – {p.away}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                  {p.meta}
                </span>
              </div>
              <div
                className={
                  "border-2 px-2 py-1.5 font-mono text-sm font-bold " +
                  (p.open ? "border-border text-muted" : "border-border-strong text-foreground")
                }
              >
                {p.open ? t("masked") : `${p.homeScore}-${p.awayScore}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
