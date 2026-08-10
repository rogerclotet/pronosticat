"use client";

import { useTranslations } from "next-intl";
import { MatchCard } from "@/components/matches/match-card";
import type { BoardMatch, BoardRound } from "@/components/challenges/types";
import { formatKickoff } from "@/lib/utils";
import type { Competition } from "@/lib/constants";

type ChallengeBoardProps = {
  round: BoardRound;
  matches: BoardMatch[];
  competition: Competition;
};

/** Read-only round summary: kickoff/lock status and fixture results. Picks are made from the predictions tab. */
export function ChallengeBoard({ round, matches, competition }: ChallengeBoardProps) {
  const t = useTranslations("board");
  const tGroup = useTranslations("group");

  const deadline =
    round.status === "settled"
      ? t("settled")
      : round.status === "open"
        ? t("closes", { time: formatKickoff(new Date(round.lockAt)) })
        : t("closed");

  return (
    <div className="flex flex-col gap-3 p-4 pb-6">
      <div className="flex items-baseline justify-between border-b-2 border-border pb-2">
        <span className="font-sans text-[15px] font-extrabold uppercase">
          {t("title", {
            round: round.matchday,
            competition: tGroup(`competitions.${competition}`),
          })}
        </span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.09em] text-muted">
          {deadline}
        </span>
      </div>

      <div className="border-b-2 border-border pb-2 font-sans text-[13.5px] font-extrabold uppercase">
        {t("fixturesTitle")}
      </div>

      {matches.length === 0 ? (
        <p className="text-sm text-muted">{t("noMatches")}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {matches.map((match) => (
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
