import { getTranslations } from "next-intl/server";
import { EditNameButton } from "@/components/profile/edit-name-button";
import { SignOutButton } from "@/components/profile/sign-out-button";
import { SegmentedBar } from "@/components/ui/progress-bar";
import { Link } from "@/i18n/routing";
import type { Competition } from "@/lib/constants";
import type { MatchdayHistoryRow, PendingStake } from "@/lib/queries/stats";

type ProfileViewProps = {
  userName: string;
  summary: { balance: number; pending: PendingStake; weeklyDelta: number };
  history: MatchdayHistoryRow[];
  competition: Competition;
};

export async function ProfileView({
  userName,
  summary,
  history,
  competition,
}: ProfileViewProps) {
  const t = await getTranslations("perfil");
  const tGroup = await getTranslations("group");
  const competitionLabel = tGroup(`competitions.${competition}`);
  const deltaLabel =
    summary.weeklyDelta >= 0
      ? `+${summary.weeklyDelta}`
      : `${summary.weeklyDelta}`;

  return (
    <div className="flex flex-col gap-3.5 p-4 pb-6">
      <EditNameButton name={userName} />

      <div className="flex flex-col gap-2.5 border-2 border-teal bg-highlight-bg p-4">
        <span className="label-mono">{t("balance")}</span>
        <span className="font-mono text-4xl font-bold text-teal">
          {summary.balance}
        </span>
        <div className="mt-1 flex">
          <div className="flex-1 border-2 border-border p-2.5">
            <div className="font-mono text-sm font-bold">
              {summary.pending.picks}
            </div>
            <div className="label-mono mt-1.5">{t("pending")}</div>
          </div>
          <div className="-ml-0.5 flex-1 border-2 border-border p-2.5">
            <div className="font-mono text-sm font-bold">
              {summary.pending.worstCase}…+{summary.pending.bestCase}
            </div>
            <div className="label-mono mt-1.5">{t("swing")}</div>
          </div>
          <div className="-ml-0.5 flex-1 border-2 border-border p-2.5">
            <div
              className={
                "font-mono text-sm font-bold " +
                (summary.weeklyDelta >= 0 ? "text-teal" : "text-danger")
              }
            >
              {deltaLabel}
            </div>
            <div className="label-mono mt-1.5">{t("thisWeek")}</div>
          </div>
        </div>
      </div>

      <div className="border-b-2 border-border pb-2 font-sans text-[15px] font-extrabold uppercase">
        {t("historyTitle")}
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-muted">{t("noHistory")}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {history.map((h) => {
            const hitPct = h.picks > 0 ? (h.hits / h.picks) * 100 : 0;
            const missPct = h.picks > 0 ? (h.misses / h.picks) * 100 : 0;
            const netLabel =
              h.netDelta >= 0 ? `+${h.netDelta}` : `${h.netDelta}`;
            return (
              <div
                key={h.matchday}
                className="border-2 border-border bg-surface"
              >
                <div className="flex items-center justify-between gap-2.5 p-2.5">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-sans text-[12.5px] font-semibold">
                      {t("historyRound", {
                        round: h.matchday,
                        competition: competitionLabel,
                      })}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                      {t("historyMeta", { count: h.picks, hits: h.hits })}
                    </span>
                  </div>
                  <span
                    className={
                      "font-mono text-sm font-bold " +
                      (h.netDelta >= 0 ? "text-teal" : "text-danger")
                    }
                  >
                    {netLabel}
                  </span>
                </div>
                <SegmentedBar
                  segments={[
                    { pct: hitPct, tone: "hit" },
                    { pct: missPct, tone: "partial" },
                  ]}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-1.5 flex flex-col gap-2">
        <Link
          href="/onboarding"
          className="border-2 border-border bg-surface px-4 py-2 text-center font-bold uppercase tracking-wide text-foreground"
        >
          {t("viewOnboarding")}
        </Link>
        <SignOutButton />
      </div>
    </div>
  );
}
