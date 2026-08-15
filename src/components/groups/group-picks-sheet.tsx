"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Pill } from "@/components/ui/pill";
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

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    getGroupPicksData(groupId).then((next) => {
      if (!cancelled) setData(next);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, groupId]);

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
      {!data ? null : data.masked ? (
        <p className="text-sm text-muted">{t("hidden")}</p>
      ) : data.slots.length === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {data.slots.map((slot) => (
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
                    <span className="font-sans text-[12.5px] font-semibold">
                      {pick.name}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold">
                        {pick.label}
                      </span>
                      {pick.isJoker && (
                        <Pill tone="teal">{tBoard("jokerBadge")}</Pill>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
