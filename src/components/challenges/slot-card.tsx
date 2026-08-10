"use client";

import { useTranslations } from "next-intl";
import { Pill } from "@/components/ui/pill";
import {
  describePick,
  describePickTeams,
  type BoardMatch,
  type BoardSlotView,
  type EntryView,
  type PickTeam,
} from "@/components/challenges/types";
import { cn, teamCode } from "@/lib/utils";

type SlotCardProps = {
  slot: BoardSlotView;
  entry: EntryView | undefined;
  matches: BoardMatch[];
  interactive: boolean;
  onOpen: () => void;
};

/** A single challenge slot: its rule, the current pick (if any), and its outcome once settled. */
export function SlotCard({ slot, entry, matches, interactive, onOpen }: SlotCardProps) {
  const t = useTranslations("board");
  const tChallenge = useTranslations("challenges");

  const pick = describePick(slot, entry, matches);
  const pickTeams = describePickTeams(slot, entry, matches);
  const settled = entry?.pointsAwarded ?? null;

  const outcome =
    settled === null
      ? null
      : settled > 0
        ? { label: t("resultHit", { points: settled }), tone: "text-teal" }
        : settled < 0
          ? { label: t("resultMiss", { points: settled }), tone: "text-danger" }
          : { label: t("resultVoid"), tone: "text-muted" };

  return (
    <div className="flex h-full flex-col border-2 border-border bg-surface">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b-2 border-border bg-background px-2.5 py-1.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="font-sans text-[12.5px] font-extrabold uppercase">
            {tChallenge(`${slot.slug}.name`)}
          </span>
          {entry?.isJoker && <Pill tone="teal">{t("jokerBadge")}</Pill>}
        </span>
        <span className="ml-auto font-mono text-[9px] tracking-[0.08em] text-muted">
          {t("payout", { reward: slot.reward, penalty: slot.penalty })}
        </span>
      </div>

      <p className="flex-1 px-2.5 py-2 font-sans text-[11.5px] leading-snug text-text-secondary">
        {tChallenge(`${slot.slug}.rule`)}
      </p>

      <button
        type="button"
        onClick={interactive ? onOpen : undefined}
        disabled={!interactive}
        className={cn(
          "flex w-full flex-col gap-1.5 border-t-2 border-border px-2.5 py-2.5 text-left font-mono text-[10.5px] font-bold tracking-[0.09em]",
          interactive && "cursor-pointer",
          pick
            ? "bg-highlight-bg text-text-secondary"
            : interactive
              ? "bg-teal text-background"
              : "bg-highlight-bg text-muted",
        )}
      >
        <span className="flex items-start justify-between gap-2">
          <PickCrests teams={pickTeams} />
          <span className={cn("shrink-0", outcome?.tone)}>
            {outcome ? outcome.label : pick ? "✎" : "→"}
          </span>
        </span>
        <span>{pick ?? t("empty")}</span>
      </button>
    </div>
  );
}

function PickCrests({ teams }: { teams: PickTeam[] }) {
  if (teams.length === 0) return null;

  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {teams.map((team) =>
        team.crest ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={team.name}
            src={team.crest}
            alt=""
            className="h-6 w-6 shrink-0 object-contain"
          />
        ) : (
          <span
            key={team.name}
            className="flex h-6 w-6 shrink-0 items-center justify-center text-[8px] font-bold text-muted"
          >
            {teamCode(team.name)}
          </span>
        ),
      )}
    </span>
  );
}
