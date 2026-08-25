"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PointsChip } from "@/components/challenges/points-chip";
import { Pill } from "@/components/ui/pill";
import { RoundSelect } from "@/components/ui/round-select";
import { Sheet } from "@/components/ui/sheet";
import {
  type GroupPicksData,
  getGroupPicksData,
} from "@/lib/actions/group-picks";

type GroupPicksSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
};

export function GroupPicksSheet({
  isOpen,
  onClose,
  groupId,
}: GroupPicksSheetProps) {
  const t = useTranslations("groupPicks");
  const tChallenge = useTranslations("challenges");
  const tBoard = useTranslations("board");
  const [data, setData] = useState<GroupPicksData | null>(null);
  const [roundId, setRoundId] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setPending(true);

    // The previous round stays on screen while the next one loads, so the
    // sheet does not collapse under the picker on every change.
    getGroupPicksData(groupId, roundId).then((next) => {
      if (cancelled) return;
      setData(next);
      setPending(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, groupId, roundId]);

  if (!isOpen) return null;

  return (
    <Sheet
      title={t("title")}
      subtitle={
        data?.matchday != null
          ? t("subtitle", { round: data.matchday })
          : undefined
      }
      onClose={onClose}
    >
      {!data ? null : (
        <div className="flex flex-col gap-3.5">
          {data.options.length > 1 && data.roundId ? (
            <RoundSelect
              options={data.options}
              value={data.roundId}
              disabled={pending}
              onChange={setRoundId}
            />
          ) : null}

          {data.totals.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="border-b-2 border-border pb-1.5 font-sans text-[12.5px] font-extrabold uppercase">
                {t("roundTotals")}
              </div>
              {data.totals.map((total, index) => (
                <div
                  key={total.userId}
                  className="flex items-center justify-between gap-2.5 border-2 border-border bg-surface p-2.5"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="label-mono shrink-0">{index + 1}</span>
                    <span className="truncate font-sans text-[12.5px] font-semibold">
                      {total.name}
                    </span>
                  </span>
                  <PointsChip points={total.points} />
                </div>
              ))}
            </div>
          )}

          {data.masked ? (
            <p className="text-sm text-muted">{t("hidden")}</p>
          ) : data.slots.length === 0 ? (
            <p className="text-sm text-muted">{t("empty")}</p>
          ) : (
            data.slots.map((slot) => (
              <div key={slot.slug} className="flex flex-col gap-1.5">
                <div className="border-b-2 border-border pb-1.5 font-sans text-[12.5px] font-extrabold uppercase">
                  {tChallenge(`${slot.slug}.name`)}
                </div>
                <div className="flex flex-col gap-2">
                  {slot.picks.map((pick) => (
                    <div
                      key={pick.userId}
                      className="flex items-center justify-between gap-2.5 border-2 border-border bg-surface p-2.5"
                    >
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className="font-sans text-[12.5px] font-semibold">
                            {pick.name}
                          </span>
                          {pick.isJoker && (
                            <Pill tone="teal">{tBoard("jokerBadge")}</Pill>
                          )}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-text-secondary">
                          {pick.label}
                        </span>
                      </div>
                      <PointsChip points={pick.pointsAwarded} />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Sheet>
  );
}
