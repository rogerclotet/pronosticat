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
};

/** Read-only fixture card: picks live on the challenge board, not on the match. */
export function MatchCard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  kickoff,
  status,
  homeTeamCrest,
  awayTeamCrest,
}: MatchCardProps) {
  const t = useTranslations("jornada");
  const showScore = status === "finished" || status === "live";

  const pill =
    status === "finished" || status === "postponed" || status === "cancelled"
      ? { tone: "muted" as const, label: t("statusFinished") }
      : status === "live"
        ? { tone: "live" as const, label: t("statusLive") }
        : { tone: "open" as const, label: t("statusOpen") };

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
