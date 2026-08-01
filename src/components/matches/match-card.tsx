import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MatchCardProps = {
  homeTeam: string;
  awayTeam: string;
  homeScore?: number | null;
  awayScore?: number | null;
  kickoff: Date;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
  homeTeamCrest?: string | null;
  awayTeamCrest?: string | null;
  prediction?: { homeScore: number; awayScore: number; wager: number } | null;
  locked?: boolean;
  onClick?: () => void;
};

export function MatchCard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  kickoff,
  status,
  homeTeamCrest,
  awayTeamCrest,
  prediction,
  locked,
  onClick,
}: MatchCardProps) {
  const t = useTranslations("match");
  const tPred = useTranslations("predictions");

  const statusLabel = {
    scheduled: t("scheduled"),
    live: t("live"),
    finished: t("finished"),
    postponed: t("postponed"),
    cancelled: t("cancelled"),
  }[status];

  const showScore = status === "finished" || status === "live";

  return (
    <Card
      className={cn(onClick && "cursor-pointer hover:bg-surface-hover")}
      onClick={onClick}
    >
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-muted">
        <span>{kickoff.toLocaleDateString("ca-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
        <span className={cn(status === "live" && "text-teal font-bold")}>{statusLabel}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <TeamBlock name={homeTeam} crest={homeTeamCrest} align="left" />
        <div className="flex shrink-0 flex-col items-center px-2">
          {showScore ? (
            <span className="text-2xl font-bold tabular-nums">
              {homeScore ?? "-"} : {awayScore ?? "-"}
            </span>
          ) : (
            <span className="text-sm font-bold uppercase text-muted">{t("vs")}</span>
          )}
        </div>
        <TeamBlock name={awayTeam} crest={awayTeamCrest} align="right" />
      </div>

      {prediction && (
        <div className="mt-3 flex items-center justify-between border-t-2 border-border pt-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted">{tPred("yourPrediction")}</span>
            <span className="font-bold tabular-nums text-teal">
              {prediction.homeScore} : {prediction.awayScore}
            </span>
          </div>
          <span className="font-bold">
            {locked ? tPred("locked") : `${prediction.wager} pts`}
          </span>
        </div>
      )}
    </Card>
  );
}

function TeamBlock({
  name,
  crest,
  align,
}: {
  name: string;
  crest?: string | null;
  align: "left" | "right";
}) {
  return (
    <div className={cn("flex flex-1 items-center gap-2", align === "right" && "flex-row-reverse")}>
      {crest && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={crest} alt="" className="h-8 w-8 object-contain" />
      )}
      <span className="text-sm font-bold leading-tight">{name}</span>
    </div>
  );
}
