"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/routing";
import { formatSeason } from "@/lib/constants";
import type { RoundOption } from "@/lib/queries/round-board";

type RoundSelectorProps = {
  options: RoundOption[];
  selectedId: string;
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

/** Switches the results screen to an earlier round; the latest one is the default. */
export function RoundSelector({ options, selectedId }: RoundSelectorProps) {
  const t = useTranslations("board");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [latest] = options;
  const bySeason = groupBySeason(options);

  function handleChange(roundId: string) {
    const params = new URLSearchParams(searchParams.toString());
    // The latest round is what the screen shows without a param — keep the URL
    // clean rather than pinning an id that will age out.
    if (roundId === latest?.id) {
      params.delete("round");
    } else {
      params.set("round", roundId);
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  function renderOption(option: RoundOption) {
    return (
      <option key={option.id} value={option.id}>
        {t("roundOption", { round: option.matchday })}
      </option>
    );
  }

  return (
    <label className="flex items-center gap-2.5 border-2 border-border bg-surface px-3 py-2">
      <span className="label-mono shrink-0">{t("roundPicker")}</span>
      <select
        value={selectedId}
        disabled={pending}
        onChange={(event) => handleChange(event.target.value)}
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
