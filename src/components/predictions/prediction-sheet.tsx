"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/ui/stat-tile";
import { savePrediction, deletePrediction } from "@/lib/actions/groups";
import { POINTS } from "@/lib/constants";
import { cn, formatKickoff } from "@/lib/utils";

type PredictionSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    kickoff: Date;
  };
  existing?: { id: string; homeScore: number; awayScore: number; wager: number } | null;
  maxPoints: number;
  maxWagerPerMatch: number;
};

function clampWager(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function PredictionSheet({
  isOpen,
  onClose,
  groupId,
  match,
  existing,
  maxPoints,
  maxWagerPerMatch,
}: PredictionSheetProps) {
  const t = useTranslations("sheet");
  const tCommon = useTranslations("common");
  const maxWager = Math.min(maxWagerPerMatch, maxPoints + (existing?.wager ?? 0));

  const [homeScore, setHomeScore] = useState(existing?.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(existing?.awayScore ?? 0);
  const [wager, setWager] = useState(
    clampWager(existing?.wager ?? POINTS.MIN_WAGER, POINTS.MIN_WAGER, maxWager),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const winExact = wager * POINTS.EXACT_RESULT_MULTIPLIER;
  const winOutcome = wager * POINTS.OUTCOME_MULTIPLIER;
  const fillPct = Math.round(((wager - POINTS.MIN_WAGER) / Math.max(1, maxWager - POINTS.MIN_WAGER)) * 100);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await savePrediction({ groupId, matchId: match.id, homeScore, awayScore, wager });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelPrediction() {
    if (!existing) return;
    setLoading(true);
    setError(null);
    try {
      await deletePrediction(existing.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet
      title={`${match.homeTeam} – ${match.awayTeam}`}
      subtitle={formatKickoff(match.kickoff)}
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
              onClick={handleCancelPrediction}
              disabled={loading}
            >
              {t("cancelLabel")}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="border-2 border-border bg-surface p-3.5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
            <ScoreStepper label={t("local")} team={match.homeTeam} value={homeScore} onChange={setHomeScore} />
            <span className="font-mono text-xl font-bold text-muted">–</span>
            <ScoreStepper label={t("visitant")} team={match.awayTeam} value={awayScore} onChange={setAwayScore} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="label-mono">{t("stakeLabel")}</span>
            <span className="font-mono text-lg font-bold text-teal">{wager}</span>
          </div>
          <div className="relative h-[34px]">
            <div className="absolute inset-x-0 top-3 h-2.5 border-2 border-border-strong bg-highlight-bg" />
            <div
              className="absolute left-0 top-3 h-2.5 bg-teal"
              style={{ width: `${Math.max(0, Math.min(100, fillPct))}%` }}
            />
            <input
              type="range"
              className="wager-slider absolute inset-0 w-full"
              min={POINTS.MIN_WAGER}
              max={maxWager}
              step={10}
              value={wager}
              onChange={(e) => setWager(clampWager(Number(e.target.value), POINTS.MIN_WAGER, maxWager))}
            />
          </div>
          <div className="flex justify-between font-mono text-[9px] text-border-strong">
            <span>{POINTS.MIN_WAGER}</span>
            <span>{maxWager}</span>
          </div>
        </div>

        <div className="flex">
          <StatTile label={t("exactLabel")} value={`+${winExact}`} accent="teal" className="flex-1" />
          <StatTile
            label={t("outLabel")}
            value={`+${winOutcome}`}
            className="-ml-0.5 flex-1"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <p className="border-l-4 border-teal-dark/60 pl-2.5 font-sans text-[10.5px] leading-relaxed text-text-secondary">
          {t("lockNote")}
        </p>
      </div>
    </Sheet>
  );
}

function ScoreStepper({
  label,
  team,
  value,
  onChange,
}: {
  label: string;
  team: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="min-h-[29px] text-center font-sans text-xs font-semibold leading-tight" title={label}>
        {team}
      </span>
      <span className="font-mono text-3xl font-bold text-teal">{value}</span>
      <div className="flex">
        <StepButton onClick={() => onChange(Math.max(0, value - 1))}>−</StepButton>
        <StepButton onClick={() => onChange(value + 1)} className="-ml-0.5">
          +
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-[38px] w-[42px] border-2 border-border-strong bg-background font-mono text-base font-bold",
        className,
      )}
    >
      {children}
    </button>
  );
}
