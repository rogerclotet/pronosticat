"use client";

import { ArrowRight, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  challengeIcons,
  fallbackChallengeIcon,
} from "@/components/challenges/challenge-icon";
import {
  type BoardMatch,
  type BoardSlotView,
  describePick,
  describePickTeams,
  type EntryView,
  type PickTeam,
} from "@/components/challenges/types";
import { Pill } from "@/components/ui/pill";
import { cn, teamCode } from "@/lib/utils";

type SlotCardProps = {
  slot: BoardSlotView;
  entry: EntryView | undefined;
  matches: BoardMatch[];
  interactive: boolean;
  onOpen: () => void;
};

/** A single challenge slot: its rule, the current pick (if any), and its outcome once settled. */
export function SlotCard({
  slot,
  entry,
  matches,
  interactive,
  onOpen,
}: SlotCardProps) {
  const t = useTranslations("board");
  const tChallenge = useTranslations("challenges");

  const pick = describePick(slot, entry, matches);
  const pickTeams = describePickTeams(slot, entry, matches);
  const settled = entry?.pointsAwarded ?? null;
  const Icon = challengeIcons[slot.slug] ?? fallbackChallengeIcon;
  const awaitingPick = pick === null && interactive;

  const outcome =
    settled === null
      ? null
      : settled > 0
        ? { label: t("resultHit", { points: settled }), tone: "text-teal" }
        : settled < 0
          ? { label: t("resultMiss", { points: settled }), tone: "text-danger" }
          : { label: t("resultMiss", { points: settled }), tone: "text-muted" };

  const trailing = outcome ? (
    <span className={cn("shrink-0", outcome.tone)}>{outcome.label}</span>
  ) : pick && interactive ? (
    <Pencil className="size-3.5 shrink-0" strokeWidth={2.5} />
  ) : pick ? null : (
    <ArrowRight className="size-3.5 shrink-0" strokeWidth={3} />
  );

  return (
    <div
      className={cn(
        "flex h-full flex-col border-2 bg-surface",
        awaitingPick ? "border-border-strong" : "border-border",
      )}
    >
      <div className="flex items-center gap-1.5 border-b-2 border-border bg-background px-2 py-1.5">
        <span
          className={cn(
            "flex size-[22px] shrink-0 items-center justify-center border-2",
            awaitingPick
              ? "border-teal bg-highlight-bg text-teal"
              : "border-border bg-surface text-muted",
          )}
        >
          <Icon className="size-3" strokeWidth={2.5} />
        </span>
        <span className="min-w-0 flex-1 font-sans text-[12px] font-extrabold uppercase leading-[1.2]">
          {tChallenge(`${slot.slug}.name`)}
        </span>
        {entry?.isJoker && (
          <Pill tone="teal" className="shrink-0 px-1 py-0.5 text-[8px]">
            {t("jokerBadge")}
          </Pill>
        )}
      </div>

      <div className="relative flex flex-1 flex-col justify-between gap-2 overflow-hidden px-2.5 pb-1.5 pt-2">
        <Icon
          aria-hidden
          className="pointer-events-none absolute -bottom-2 -right-1 size-12 text-teal opacity-[0.07]"
          strokeWidth={1.5}
        />
        <p className="relative font-sans text-[11.5px] leading-snug text-text-secondary">
          {tChallenge(`${slot.slug}.rule`)}
        </p>
        <span className="relative flex items-center gap-1 font-mono text-[9px] font-bold tracking-[0.08em]">
          <span className="text-teal">+{slot.reward}</span>
          {slot.penalty !== 0 && (
            <>
              <span className="text-border-strong">/</span>
              <span className="text-danger">{slot.penalty}</span>
            </>
          )}
        </span>
      </div>

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
        {pickTeams.length > 0 ? (
          <>
            <span className="flex items-start justify-between gap-2">
              <PickCrests teams={pickTeams} />
              {trailing}
            </span>
            <span>{pick}</span>
          </>
        ) : (
          <span className="flex w-full items-center justify-between gap-2">
            <span className="min-w-0">{pick ?? t("empty")}</span>
            {trailing}
          </span>
        )}
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
