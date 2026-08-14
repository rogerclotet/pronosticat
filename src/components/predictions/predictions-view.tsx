"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ChallengeSheet } from "@/components/challenges/challenge-sheet";
import { SlotCard } from "@/components/challenges/slot-card";
import {
  type BoardMatch,
  type BoardRound,
  type BoardSlotView,
  describePickTeams,
  type EntryView,
} from "@/components/challenges/types";
import { SegmentedBar } from "@/components/ui/progress-bar";
import { StatTile } from "@/components/ui/stat-tile";
import type { Competition } from "@/lib/constants";
import type { MatchdayHistoryRow } from "@/lib/queries/stats";
import { cn } from "@/lib/utils";

type PredictionsViewProps = {
  round: BoardRound;
  slots: BoardSlotView[];
  matches: BoardMatch[];
  entries: EntryView[];
  history: MatchdayHistoryRow[];
  groupId: string;
  competition: Competition;
};

export function PredictionsView({
  round,
  slots,
  matches,
  entries,
  history,
  groupId,
  competition,
}: PredictionsViewProps) {
  const t = useTranslations("predictions");
  const tBoard = useTranslations("board");
  const tChallenge = useTranslations("challenges");
  const tGroup = useTranslations("group");
  const tPerfil = useTranslations("perfil");

  const [openSlotId, setOpenSlotId] = useState<string | null>(null);

  const entryBySlot = new Map(entries.map((e) => [e.roundChallengeId, e]));
  const played = slots.filter((slot) => entryBySlot.has(slot.id));
  const hits = entries.filter((e) => (e.pointsAwarded ?? 0) > 0).length;
  const pointsThisRound = entries.reduce(
    (sum, e) => sum + (e.pointsAwarded ?? 0),
    0,
  );

  const isOpen = round.status === "open";
  const remaining = slots.length - played.length;

  const jokerEntry = entries.find((e) => e.isJoker);
  const jokerSlug = jokerEntry
    ? slots.find((s) => s.id === jokerEntry.roundChallengeId)?.slug
    : undefined;

  const openSlot = slots.find((slot) => slot.id === openSlotId) ?? null;

  // A team already anchoring another pick this round can't be picked again:
  // map its name to the (translated) challenge already holding it.
  const teamsInUse = new Map<string, string>();
  if (openSlot) {
    for (const slot of slots) {
      if (slot.id === openSlot.id) continue;
      const entry = entryBySlot.get(slot.id);
      for (const team of describePickTeams(slot, entry, matches)) {
        teamsInUse.set(team.name, tChallenge(`${slot.slug}.name`));
      }
    }
  }

  return (
    <div className="flex flex-col gap-3.5 p-4 pb-6">
      <div className="border-b-2 border-border pb-2 font-sans text-[15px] font-extrabold uppercase">
        {t("title")}
      </div>

      <div className="flex">
        <StatTile
          label={t("statMade", { round: round.matchday })}
          value={`${played.length}/${slots.length}`}
          className="flex-1"
        />
        <StatTile
          label={t("statHits")}
          value={hits}
          accent="teal"
          className="-ml-0.5 flex-1"
        />
        <StatTile
          label={t("statPoints")}
          value={pointsThisRound > 0 ? `+${pointsThisRound}` : pointsThisRound}
          accent={pointsThisRound >= 0 ? "teal" : "danger"}
          className="-ml-0.5 flex-1"
        />
      </div>

      {slots.length > 0 && (
        <div className="flex items-center justify-between gap-2.5 border-2 border-teal bg-highlight-bg px-3 py-2.5">
          <span className="font-sans text-[11.5px] font-semibold leading-snug text-text-secondary">
            {!isOpen
              ? tBoard("hintLocked")
              : remaining > 0
                ? tBoard("hint", { count: remaining })
                : tBoard("hintNone")}
          </span>
          <span className="font-mono text-xs font-bold text-teal">
            {tBoard("progress", { used: played.length, total: slots.length })}
          </span>
        </div>
      )}

      {slots.length === 0 ? (
        <p className="text-sm text-muted">{tBoard("notReady")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {slots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              entry={entryBySlot.get(slot.id)}
              matches={matches}
              interactive={isOpen}
              onOpen={() => setOpenSlotId(slot.id)}
            />
          ))}
        </div>
      )}

      {history.length > 0 && (
        <>
          <div className="mt-1.5 border-b-2 border-border pb-2 font-sans text-[13.5px] font-extrabold uppercase">
            {t("historyTitle")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {history.map((row) => (
              <RoundHistoryCard
                key={row.matchday}
                row={row}
                label={tPerfil("historyRound", {
                  round: row.matchday,
                  competition: tGroup(`competitions.${competition}`),
                })}
                meta={tPerfil("historyMeta", {
                  count: row.picks,
                  hits: row.hits,
                })}
              />
            ))}
          </div>
        </>
      )}

      {openSlot && (
        <ChallengeSheet
          onClose={() => setOpenSlotId(null)}
          groupId={groupId}
          slot={openSlot}
          matches={matches}
          existing={entryBySlot.get(openSlot.id) ?? null}
          jokerHolder={
            jokerSlug && jokerSlug !== openSlot.slug
              ? tChallenge(`${jokerSlug}.name`)
              : null
          }
          teamsInUse={teamsInUse}
        />
      )}
    </div>
  );
}

function RoundHistoryCard({
  row,
  label,
  meta,
}: {
  row: MatchdayHistoryRow;
  label: string;
  meta: string;
}) {
  const hitPct = row.picks > 0 ? (row.hits / row.picks) * 100 : 0;
  const missPct = row.picks > 0 ? (row.misses / row.picks) * 100 : 0;

  return (
    <div className="flex flex-col border-2 border-border bg-surface">
      <div className="flex items-start justify-between gap-1 p-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-sans text-[10.5px] font-semibold">
            {label}
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-muted">
            {meta}
          </span>
        </div>
        <span
          className={cn(
            "shrink-0 font-mono text-xs font-bold",
            row.netDelta >= 0 ? "text-teal" : "text-danger",
          )}
        >
          {row.netDelta >= 0 ? `+${row.netDelta}` : row.netDelta}
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
}
