"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { StatTile } from "@/components/ui/stat-tile";
import { Pill } from "@/components/ui/pill";
import { PredictionSheet } from "@/components/predictions/prediction-sheet";
import { POINTS } from "@/lib/constants";
import { cn, formatKickoff } from "@/lib/utils";

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
};

type Prediction = {
  id: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  wager: number;
  pointsAwarded: number | null;
};

type PredictionsViewProps = {
  matches: Match[];
  predictions: Prediction[];
  groupId: string;
  matchday: number;
  maxPoints: number;
};

export function PredictionsView({
  matches,
  predictions,
  groupId,
  matchday,
  maxPoints,
}: PredictionsViewProps) {
  const t = useTranslations("predictions");
  const tJornada = useTranslations("jornada");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const matchMap = new Map(matches.map((m) => [m.id, m]));

  const stats = useMemo(() => {
    const exact = predictions.filter(
      (p) => p.pointsAwarded != null && p.pointsAwarded >= p.wager * POINTS.EXACT_RESULT_MULTIPLIER,
    ).length;
    const pointsThisRound = predictions.reduce(
      (sum, p) => (p.pointsAwarded != null ? sum + (p.pointsAwarded - p.wager) : sum),
      0,
    );
    return { made: predictions.length, exact, pointsThisRound };
  }, [predictions]);

  const selectedMatch = selectedMatchId ? matchMap.get(selectedMatchId) : null;
  const selectedPred = selectedMatchId
    ? predictions.find((p) => p.matchId === selectedMatchId)
    : null;

  return (
    <div className="flex flex-col gap-3.5 p-4 pb-6">
      <div className="border-b-2 border-border pb-2 font-sans text-[15px] font-extrabold uppercase">
        {t("title")}
      </div>

      <div className="flex">
        <StatTile label={t("statMade", { round: matchday })} value={stats.made} className="flex-1" />
        <StatTile
          label={t("statExact")}
          value={stats.exact}
          accent="teal"
          className="-ml-0.5 flex-1"
        />
        <StatTile
          label={t("statPoints")}
          value={stats.pointsThisRound >= 0 ? `+${stats.pointsThisRound}` : stats.pointsThisRound}
          accent="teal"
          className="-ml-0.5 flex-1"
        />
      </div>

      {predictions.length === 0 ? (
        <p className="text-sm text-muted">{t("noPredictions")}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {predictions.map((p) => {
            const match = matchMap.get(p.matchId);
            if (!match) return null;
            const open = match.status === "scheduled";
            const settled = p.pointsAwarded != null;
            const delta = settled
              ? `+${p.pointsAwarded}`
              : open
                ? `-${p.wager} ${t("reserved")}`
                : `-${p.wager}`;

            return (
              <button
                key={p.id}
                type="button"
                disabled={!open}
                onClick={open ? () => setSelectedMatchId(p.matchId) : undefined}
                className={cn(
                  "w-full border-2 border-border bg-surface text-left",
                  open && "cursor-pointer",
                )}
              >
                <div className="flex items-center justify-between gap-2 border-b-2 border-border bg-background px-2.5 py-1.5">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    {formatKickoff(new Date(match.kickoff))}
                  </span>
                  <Pill tone={settled ? "teal" : open ? "open" : "muted"}>
                    {settled
                      ? tJornada("statusFinished")
                      : open
                        ? tJornada("statusOpen")
                        : tJornada("statusLive")}
                  </Pill>
                </div>
                <div className="flex items-center justify-between gap-2.5 p-2.5">
                  <span className="flex-1 font-sans text-[12.5px] font-semibold">
                    {match.homeTeam} – {match.awayTeam}
                  </span>
                  <span className="border-2 border-border-strong px-2 py-1.5 font-mono text-sm font-bold">
                    {p.homeScore}-{p.awayScore}
                  </span>
                  <span
                    className={cn(
                      "min-w-[56px] text-right font-mono text-xs font-bold",
                      settled ? "text-teal" : "text-muted",
                    )}
                  >
                    {delta}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedMatch && (
        <PredictionSheet
          isOpen
          onClose={() => setSelectedMatchId(null)}
          groupId={groupId}
          match={{
            id: selectedMatch.id,
            homeTeam: selectedMatch.homeTeam,
            awayTeam: selectedMatch.awayTeam,
            kickoff: new Date(selectedMatch.kickoff),
          }}
          existing={selectedPred ?? null}
          maxPoints={maxPoints}
        />
      )}
    </div>
  );
}
