import { useTranslations } from "next-intl";
import { Pill } from "@/components/ui/pill";
import { cn, formatKickoff, teamCode } from "@/lib/utils";

type MatchStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled";

type MatchCardProps = {
  homeTeam: string;
  awayTeam: string;
  homeScore?: number | null;
  awayScore?: number | null;
  kickoff: Date;
  status: MatchStatus;
  homeTeamCrest?: string | null;
  awayTeamCrest?: string | null;
  prediction?: { homeScore: number; awayScore: number; wager: number; settled?: number | null } | null;
  onOpenPrediction?: () => void;
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
  onOpenPrediction,
}: MatchCardProps) {
  const t = useTranslations("jornada");
  const showScore = status === "finished" || status === "live";
  const open = status === "scheduled";

  const pill =
    status === "finished" || status === "postponed" || status === "cancelled"
      ? { tone: "muted" as const, label: t("statusFinished") }
      : status === "live"
        ? { tone: "live" as const, label: t("statusLive") }
        : { tone: "open" as const, label: t("statusOpen") };

  const cta = prediction
    ? prediction.settled != null
      ? {
          label: t("ctaLocked", { home: prediction.homeScore, away: prediction.awayScore }),
          right: `+${prediction.settled}`,
          className: "bg-teal/10 text-teal",
        }
      : {
          label: open
            ? t("ctaPredicted", { home: prediction.homeScore, away: prediction.awayScore })
            : t("ctaLocked", { home: prediction.homeScore, away: prediction.awayScore }),
          right: `${prediction.wager} PTS`,
          className: "bg-highlight-bg text-text-secondary",
        }
    : open
      ? { label: t("ctaPredict"), right: "→", className: "bg-teal text-background" }
      : { label: t("ctaNone"), right: "—", className: "bg-highlight-bg text-muted" };

  return (
    <div className="border-2 border-border bg-surface">
      <div className="flex items-center justify-between border-b-2 border-border bg-background px-2.5 py-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
          {formatKickoff(kickoff)}
        </span>
        <Pill tone={pill.tone}>{pill.label}</Pill>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2.5 py-3.5">
        <TeamBlock name={homeTeam} crest={homeTeamCrest} />
        <span
          className={cn(
            "min-w-[54px] text-center font-mono text-base font-bold",
            showScore ? "text-foreground" : "text-muted",
          )}
        >
          {showScore ? `${homeScore ?? "-"} - ${awayScore ?? "-"}` : "vs"}
        </span>
        <TeamBlock name={awayTeam} crest={awayTeamCrest} />
      </div>

      <button
        type="button"
        onClick={open ? onOpenPrediction : undefined}
        disabled={!open}
        className={cn(
          "flex w-full items-center justify-between gap-2 border-t-2 border-border px-2.5 py-2.5 text-left font-mono text-[10.5px] font-bold tracking-[0.09em]",
          open && "cursor-pointer",
          cta.className,
        )}
      >
        <span>{cta.label}</span>
        <span>{cta.right}</span>
      </button>
    </div>
  );
}

function TeamBlock({ name, crest }: { name: string; crest?: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={crest} alt="" className="h-[38px] w-[38px] object-contain" />
      ) : (
        <div className="flex h-[38px] w-[38px] items-center justify-center">
          <span className="font-mono text-xs font-bold text-text-secondary">
            {teamCode(name)}
          </span>
        </div>
      )}
      <span className="text-center font-sans text-xs font-semibold leading-tight">{name}</span>
    </div>
  );
}
