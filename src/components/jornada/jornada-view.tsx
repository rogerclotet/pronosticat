"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MatchCard } from "@/components/matches/match-card";
import { PredictionSheet } from "@/components/predictions/prediction-sheet";
import { formatKickoff } from "@/lib/utils";
import type { Competition } from "@/lib/constants";

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  kickoff: string;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
  homeTeamCrest?: string | null;
  awayTeamCrest?: string | null;
};

type Prediction = {
  id: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  wager: number;
  pointsAwarded: number | null;
};

type JornadaViewProps = {
  matches: Match[];
  predictions: Prediction[];
  groupId: string;
  matchday: number;
  competition: Competition;
  maxPoints: number;
};

export function JornadaView({
  matches,
  predictions,
  groupId,
  matchday,
  competition,
  maxPoints,
}: JornadaViewProps) {
  const t = useTranslations("jornada");
  const tGroup = useTranslations("group");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const predMap = new Map(predictions.map((p) => [p.matchId, p]));
  const unpredictedCount = matches.filter(
    (m) => m.status === "scheduled" && !predMap.has(m.id),
  ).length;

  const nextKickoff = matches
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0]?.kickoff;

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);
  const selectedPred = selectedMatchId ? predMap.get(selectedMatchId) : null;

  return (
    <div className="flex flex-col gap-3 p-4 pb-6">
      <div className="flex items-baseline justify-between border-b-2 border-border pb-2">
        <span className="font-sans text-[15px] font-extrabold uppercase">
          {t("title", { round: matchday, competition: tGroup(`competitions.${competition}`) })}
        </span>
        {nextKickoff && (
          <span className="font-mono text-[9.5px] uppercase tracking-[0.09em] text-muted">
            {t("roundClose", { time: formatKickoff(new Date(nextKickoff)) })}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2.5 border-2 border-teal bg-highlight-bg px-3 py-2.5">
        <span className="font-sans text-[11.5px] font-semibold leading-snug text-text-secondary">
          {unpredictedCount > 0 ? t("hint", { count: unpredictedCount }) : t("hintNone")}
        </span>
        <span className="font-mono text-xs font-bold text-teal">{predictions.length}/{matches.length}</span>
      </div>

      {matches.length === 0 ? (
        <p className="text-sm text-muted">{t("noMatches")}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {matches.map((match) => {
            const pred = predMap.get(match.id);
            return (
              <MatchCard
                key={match.id}
                homeTeam={match.homeTeam}
                awayTeam={match.awayTeam}
                homeScore={match.homeScore}
                awayScore={match.awayScore}
                kickoff={new Date(match.kickoff)}
                status={match.status}
                homeTeamCrest={match.homeTeamCrest}
                awayTeamCrest={match.awayTeamCrest}
                prediction={
                  pred
                    ? {
                        homeScore: pred.homeScore,
                        awayScore: pred.awayScore,
                        wager: pred.wager,
                        settled: pred.pointsAwarded,
                      }
                    : null
                }
                onOpenPrediction={() => setSelectedMatchId(match.id)}
              />
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
