"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/ui/stat-tile";
import {
  MatchPicker,
  NumberPicker,
  ScorePicker,
  TeamPicker,
} from "@/components/challenges/pickers";
import type {
  BoardMatch,
  BoardSlotView,
  EntryView,
} from "@/components/challenges/types";
import { saveEntry, deleteEntry } from "@/lib/actions/groups";
import type { TargetSide } from "@/lib/challenges/types";
import { cn } from "@/lib/utils";

type ChallengeSheetProps = {
  onClose: () => void;
  groupId: string;
  slot: BoardSlotView;
  matches: BoardMatch[];
  existing: EntryView | null;
  /** Name of the challenge already carrying the joker, if it isn't this one. */
  jokerHolder: string | null;
};

export function ChallengeSheet({
  onClose,
  groupId,
  slot,
  matches,
  existing,
  jokerHolder,
}: ChallengeSheetProps) {
  const t = useTranslations("sheet");
  const tChallenge = useTranslations("challenges");
  const tCommon = useTranslations("common");

  const [matchId, setMatchId] = useState<string | null>(
    existing?.targetMatchId ?? null,
  );
  const [side, setSide] = useState<TargetSide | null>(
    existing?.targetSide ?? null,
  );
  const [homeScore, setHomeScore] = useState(existing?.predictedHome ?? 0);
  const [awayScore, setAwayScore] = useState(existing?.predictedAway ?? 0);
  const [numericValue, setNumericValue] = useState(existing?.numericValue ?? 0);
  const [isJoker, setIsJoker] = useState(existing?.isJoker ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMatch = matches.find((m) => m.id === matchId) ?? null;
  const jokerLocked = jokerHolder !== null;

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await saveEntry({
        groupId,
        roundChallengeId: slot.id,
        targetMatchId: matchId,
        targetSide: side,
        predictedHome: homeScore,
        predictedAway: awayScore,
        numericValue,
        isJoker,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    if (!existing) return;
    setLoading(true);
    setError(null);
    try {
      await deleteEntry(existing.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet
      title={tChallenge(`${slot.slug}.name`)}
      subtitle={tChallenge(`${slot.slug}.rule`)}
      onClose={onClose}
      footer={
        <>
          <Button type="button" onClick={handleConfirm} disabled={loading} size="lg">
            {existing ? t("ctaEdit") : t("ctaNew")}
          </Button>
          {existing && (
            <Button
              type="button"
              variant="danger"
              onClick={handleRemove}
              disabled={loading}
            >
              {t("cancelLabel")}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex">
          <StatTile
            label={t("rewardLabel")}
            value={`+${slot.reward * (isJoker ? 2 : 1)}`}
            accent="teal"
            className="flex-1"
          />
          <StatTile
            label={t("penaltyLabel")}
            value={String(slot.penalty * (isJoker ? 2 : 1))}
            accent="danger"
            className="-ml-0.5 flex-1"
          />
        </div>

        {slot.targetKind === "number" ? (
          <>
            <span className="label-mono">{t("pickNumber")}</span>
            <NumberPicker value={numericValue} onChange={setNumericValue} />
          </>
        ) : slot.targetKind === "team" ? (
          <>
            <span className="label-mono">{t("pickTeam")}</span>
            <TeamPicker
              matches={matches}
              selectedMatchId={matchId}
              selectedSide={side}
              onSelect={(id, nextSide) => {
                setMatchId(id);
                setSide(nextSide);
              }}
            />
          </>
        ) : (
          <>
            <span className="label-mono">{t("pickMatch")}</span>
            <MatchPicker
              matches={matches}
              selectedId={matchId}
              onSelect={setMatchId}
            />
          </>
        )}

        {slot.targetKind === "match_score" && (
          <>
            <span className="label-mono">{t("pickScore")}</span>
            {selectedMatch ? (
              <ScorePicker
                homeTeam={selectedMatch.homeTeam}
                awayTeam={selectedMatch.awayTeam}
                homeScore={homeScore}
                awayScore={awayScore}
                onChange={(home, away) => {
                  setHomeScore(home);
                  setAwayScore(away);
                }}
              />
            ) : (
              <p className="text-sm text-muted">{t("pickMatchFirst")}</p>
            )}
          </>
        )}

        <JokerToggle
          checked={isJoker}
          disabled={jokerLocked}
          onChange={setIsJoker}
          note={
            jokerHolder
              ? t("jokerTakenNote", { challenge: jokerHolder })
              : t("jokerNote")
          }
          label={t("jokerLabel")}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <p className="border-l-4 border-teal-dark/60 pl-2.5 font-sans text-[10.5px] leading-relaxed text-text-secondary">
          {t("lockNote")}
        </p>
      </div>
    </Sheet>
  );
}

function JokerToggle({
  checked,
  disabled,
  onChange,
  label,
  note,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
  label: string;
  note: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-2.5 border-2 px-2.5 py-2.5 text-left disabled:opacity-50",
        checked ? "border-teal bg-highlight-bg" : "border-border bg-surface",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center border-2 font-mono text-xs font-bold",
          checked ? "border-teal text-teal" : "border-border-strong text-transparent",
        )}
      >
        ×2
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.09em]">
          {label}
        </span>
        <span className="font-sans text-[10.5px] leading-snug text-text-secondary">
          {note}
        </span>
      </span>
    </button>
  );
}
