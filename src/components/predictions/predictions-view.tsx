"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MatchCard } from "@/components/matches/match-card";
import { PredictionForm } from "@/components/predictions/prediction-form";

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
  lockedAt: string | null;
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
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const predMap = new Map(predictions.map((p) => [p.matchId, p]));

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);
  const selectedPred = selectedMatchId ? predMap.get(selectedMatchId) : null;

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-black uppercase tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted">{t("round", { round: matchday })}</p>
      </header>

      {selectedMatch && selectedMatch.status === "scheduled" ? (
        <div className="space-y-4">
          <MatchCard
            homeTeam={selectedMatch.homeTeam}
            awayTeam={selectedMatch.awayTeam}
            kickoff={new Date(selectedMatch.kickoff)}
            status={selectedMatch.status}
            homeTeamCrest={selectedMatch.homeTeamCrest}
            awayTeamCrest={selectedMatch.awayTeamCrest}
          />
          <PredictionForm
            groupId={groupId}
            matchId={selectedMatch.id}
            existing={selectedPred ?? null}
            maxPoints={maxPoints}
            onClose={() => setSelectedMatchId(null)}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {matches.length === 0 ? (
            <p className="text-muted">{t("noMatches")}</p>
          ) : (
            matches.map((match) => {
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
                        }
                      : null
                  }
                  locked={!!pred?.lockedAt || match.status !== "scheduled"}
                  onClick={
                    match.status === "scheduled" && !pred?.lockedAt
                      ? () => setSelectedMatchId(match.id)
                      : undefined
                  }
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
