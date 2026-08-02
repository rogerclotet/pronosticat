"use client";

import { useTranslations } from "next-intl";

type TopBarProps = {
  groupName: string;
  balance: number;
  committedPoints: number;
  onOpenGroups: () => void;
};

export function TopBar({ groupName, balance, committedPoints, onOpenGroups }: TopBarProps) {
  const t = useTranslations("topbar");

  return (
    <div className="border-b-2 border-border bg-header-bg">
      <div className="mx-auto flex max-w-lg items-end justify-between gap-3 px-4 pb-3 pt-6">
        <button
          type="button"
          onClick={onOpenGroups}
          className="flex flex-col items-start gap-1 bg-transparent p-0 text-left"
        >
          <span className="font-sans text-lg font-extrabold uppercase tracking-tight">
            Pronosticat
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.11em] text-muted">
            <span>{groupName}</span>
            <span className="text-teal">▾</span>
          </span>
        </button>
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-lg font-bold tabular-nums text-teal">{balance}</span>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.09em] text-muted">
            {t("committed", { points: committedPoints })}
          </span>
        </div>
      </div>
    </div>
  );
}
