import { getTranslations } from "next-intl/server";
import { type Competition, formatSeason } from "@/lib/constants";
import type { ArchiveSeason } from "@/lib/queries/archive";
import { cn } from "@/lib/utils";

type ArchiveViewProps = {
  seasons: ArchiveSeason[];
  competition: Competition;
  viewerUserId: string;
};

export async function ArchiveView({
  seasons,
  competition,
  viewerUserId,
}: ArchiveViewProps) {
  const t = await getTranslations("archive");
  const tGroup = await getTranslations("group");
  const competitionLabel = tGroup(`competitions.${competition}`);

  return (
    <div className="flex flex-col gap-5 p-4 pb-6">
      {seasons.map((season, index) => {
        const champion = season.standings[0];
        // The newest season is still being played unless the table is full.
        const isCurrent = index === 0;

        return (
          <section key={season.season} className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-2 border-b-2 border-border pb-2">
              <span className="font-sans text-[15px] font-extrabold uppercase">
                {formatSeason(season.season)}
              </span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.09em] text-muted">
                {t("roundCount", { count: season.rounds.length })}
              </span>
            </div>

            {champion && !isCurrent ? (
              <div className="flex items-center justify-between gap-2.5 border-2 border-teal bg-highlight-bg p-3">
                <div className="flex flex-col gap-1">
                  <span className="label-mono">{t("champion")}</span>
                  <span className="font-sans text-[13.5px] font-extrabold">
                    {champion.name}
                  </span>
                </div>
                <span className="font-mono text-lg font-bold text-teal tabular-nums">
                  {champion.points}
                </span>
              </div>
            ) : null}

            <div className="border-2 border-border bg-surface">
              <div className="border-b-2 border-border px-2.5 py-2">
                <span className="label-mono">
                  {isCurrent ? t("tableSoFar") : t("tableFinal")}
                </span>
              </div>
              {season.standings.map((row) => (
                <div
                  key={row.userId}
                  className={cn(
                    "flex items-center gap-2.5 border-b-2 border-border px-2.5 py-2 last:border-b-0",
                    row.userId === viewerUserId && "bg-highlight-bg",
                  )}
                >
                  <span
                    className={cn(
                      "w-6 font-mono text-sm font-bold",
                      row.rank === 1 ? "text-teal" : "text-muted",
                    )}
                  >
                    {String(row.rank).padStart(2, "0")}
                  </span>
                  <span className="flex-1 font-sans text-[12.5px] font-semibold">
                    {row.name}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                    {row.hits}✓
                  </span>
                  <span className="font-mono text-sm font-bold tabular-nums">
                    {row.points}
                  </span>
                </div>
              ))}
            </div>

            <details className="border-2 border-border bg-surface">
              <summary className="cursor-pointer px-2.5 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.09em] text-teal">
                {t("roundsToggle")}
              </summary>
              <div className="border-t-2 border-border">
                {season.rounds.map((round) => {
                  const netLabel =
                    round.netDelta >= 0
                      ? `+${round.netDelta}`
                      : `${round.netDelta}`;
                  return (
                    <div
                      key={round.roundId}
                      className="flex items-center justify-between gap-2.5 border-b-2 border-border px-2.5 py-2 last:border-b-0"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-sans text-[12.5px] font-semibold">
                          {t("round", {
                            round: round.matchday,
                            competition: competitionLabel,
                          })}
                        </span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                          {round.picks === 0
                            ? t("roundSkipped")
                            : t("roundMeta", {
                                count: round.picks,
                                hits: round.hits,
                              })}
                        </span>
                      </div>
                      {round.picks > 0 ? (
                        <span
                          className={cn(
                            "font-mono text-sm font-bold tabular-nums",
                            round.netDelta >= 0 ? "text-teal" : "text-danger",
                          )}
                        >
                          {netLabel}
                        </span>
                      ) : (
                        <span className="font-mono text-sm text-muted">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          </section>
        );
      })}
    </div>
  );
}
