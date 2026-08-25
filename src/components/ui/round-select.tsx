"use client";

import { useTranslations } from "next-intl";
import { formatSeason } from "@/lib/constants";
import type { RoundOption } from "@/lib/queries/round-board";

type RoundSelectProps = {
  options: RoundOption[];
  value: string;
  disabled?: boolean;
  onChange: (roundId: string) => void;
};

function groupBySeason(options: RoundOption[]): Map<number, RoundOption[]> {
  const bySeason = new Map<number, RoundOption[]>();
  for (const option of options) {
    const seasonOptions = bySeason.get(option.season);
    if (seasonOptions) {
      seasonOptions.push(option);
      continue;
    }
    bySeason.set(option.season, [option]);
  }
  return bySeason;
}

/** The round dropdown itself: which round to show, seasons kept apart. */
export function RoundSelect({
  options,
  value,
  disabled,
  onChange,
}: RoundSelectProps) {
  const t = useTranslations("board");
  const bySeason = groupBySeason(options);

  function renderOption(option: RoundOption) {
    return (
      <option key={option.id} value={option.id}>
        {option.open
          ? t("roundOptionOpen", { round: option.matchday })
          : t("roundOption", { round: option.matchday })}
      </option>
    );
  }

  return (
    <label className="flex items-center gap-2.5 border-2 border-border bg-surface px-3 py-2">
      <span className="label-mono shrink-0">{t("roundPicker")}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent text-right font-mono text-[11px] font-bold uppercase tracking-[0.09em] text-teal focus:outline-none disabled:opacity-60"
      >
        {bySeason.size > 1
          ? [...bySeason].map(([season, seasonOptions]) => (
              <optgroup key={season} label={formatSeason(season)}>
                {seasonOptions.map(renderOption)}
              </optgroup>
            ))
          : options.map(renderOption)}
      </select>
    </label>
  );
}
