"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Pill } from "@/components/ui/pill";
import { Sheet } from "@/components/ui/sheet";
import { StatTile } from "@/components/ui/stat-tile";
import { getRivalSheetData, type RivalSheetData } from "@/lib/actions/rival";

type RivalSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  rivalUserId: string;
};

export function RivalSheet({
  isOpen,
  onClose,
  groupId,
  rivalUserId,
}: RivalSheetProps) {
  const t = useTranslations("rival");
  const tChallenge = useTranslations("challenges");
  const tBoard = useTranslations("board");
  const [data, setData] = useState<RivalSheetData | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    getRivalSheetData(groupId, rivalUserId).then((next) => {
      if (!cancelled) setData(next);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, groupId, rivalUserId]);

  if (!isOpen) return null;

  const delta = data?.weeklyDelta ?? 0;
  const deltaLabel = delta >= 0 ? `+${delta}` : `${delta}`;
  const masked = data?.masked ?? true;

  return (
    <Sheet
      title={data?.name ?? ""}
      subtitle={
        data ? t("meta", { points: data.points, delta: deltaLabel }) : undefined
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex">
          <StatTile
            label={t("hits")}
            value={data?.stats.hits ?? "–"}
            className="flex-1"
          />
          <StatTile
            label={t("jokers")}
            value={data?.stats.jokersLanded ?? "–"}
            accent="teal"
            className="-ml-0.5 flex-1"
          />
          <StatTile
            label={t("streak")}
            value={data?.stats.currentStreak ?? "–"}
            accent={data && data.stats.currentStreak > 2 ? "teal" : "default"}
            className="-ml-0.5 flex-1"
          />
        </div>

        {data?.matchday != null && (
          <div className="border-b-2 border-border pb-2 font-sans text-[13.5px] font-extrabold uppercase">
            {t("predictionsTitle", { round: data.matchday })}
          </div>
        )}

        {data && data.picks.length === 0 ? (
          <p className="text-sm text-muted">{t("noPicks")}</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {(data?.picks ?? []).map((pick) => (
              <div
                key={pick.slug}
                className="flex items-center justify-between gap-2.5 border-2 border-border bg-surface p-2.5"
              >
                <div className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="font-sans text-[12.5px] font-semibold">
                      {tChallenge(`${pick.slug}.name`)}
                    </span>
                    {pick.isJoker && (
                      <Pill tone="teal">{tBoard("jokerBadge")}</Pill>
                    )}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                    {masked ? t("hidden") : (pick.label ?? "—")}
                  </span>
                </div>
                <div
                  className={
                    "border-2 px-2 py-1.5 font-mono text-sm font-bold " +
                    (masked
                      ? "border-border text-muted"
                      : "border-border-strong text-foreground")
                  }
                >
                  {masked
                    ? t("masked")
                    : pick.pointsAwarded === null
                      ? "·"
                      : pick.pointsAwarded > 0
                        ? `+${pick.pointsAwarded}`
                        : String(pick.pointsAwarded)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
