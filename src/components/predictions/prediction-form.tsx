"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { savePrediction, deletePrediction } from "@/lib/actions/groups";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { POINTS } from "@/lib/constants";

type PredictionFormProps = {
  groupId: string;
  matchId: string;
  existing?: {
    id: string;
    homeScore: number;
    awayScore: number;
    wager: number;
  } | null;
  maxPoints: number;
  onClose: () => void;
};

export function PredictionForm({
  groupId,
  matchId,
  existing,
  maxPoints,
  onClose,
}: PredictionFormProps) {
  const t = useTranslations("predictions");
  const tCommon = useTranslations("common");
  const [homeScore, setHomeScore] = useState(existing?.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(existing?.awayScore ?? 0);
  const maxWager = Math.min(POINTS.MAX_WAGER, maxPoints);
  const [wager, setWager] = useState(
    clampWager(existing?.wager ?? POINTS.MIN_WAGER, POINTS.MIN_WAGER, maxWager),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await savePrediction({ groupId, matchId, homeScore, awayScore, wager });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    setLoading(true);
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
    <Card className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-center gap-4">
          <ScoreInput value={homeScore} onChange={setHomeScore} label="Local" />
          <span className="text-2xl font-bold">:</span>
          <ScoreInput value={awayScore} onChange={setAwayScore} label="Visitant" />
        </div>

        <WagerInput
          label={`${t("wager")} (${POINTS.MIN_WAGER}-${maxWager})`}
          value={wager}
          onChange={setWager}
          min={POINTS.MIN_WAGER}
          max={maxWager}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={loading}>
            {existing ? t("edit") : t("predict")}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </Button>
        </div>
      </form>

      {existing && (
        <Button
          variant="danger"
          className="w-full"
          onClick={handleDelete}
          disabled={loading}
        >
          {t("cancel")}
        </Button>
      )}
    </Card>
  );
}

function clampWager(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function WagerInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function commit(raw: string) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      onChange(value);
    } else {
      onChange(clampWager(parsed, min, max));
    }
    setDraft(null);
  }

  return (
    <div>
      <span className="mb-2 block text-xs uppercase tracking-wider text-muted">{label}</span>
      <input
        type="range"
        className="wager-slider w-full"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => {
          setDraft(null);
          onChange(Number(e.target.value));
        }}
      />
      <div className="mt-3 flex items-center justify-center gap-1">
        <AdjustButton
          disabled={value <= min}
          onClick={() => {
            setDraft(null);
            onChange(clampWager(value - 1, min, max));
          }}
        >
          -
        </AdjustButton>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={label}
          className="w-16 border-2 border-border bg-background py-1 text-center text-lg font-bold tabular-nums text-foreground focus:border-teal focus:outline-none"
          value={draft ?? String(value)}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
          onFocus={() => setDraft(String(value))}
          onBlur={() => draft !== null && commit(draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(draft ?? String(value));
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <AdjustButton
          disabled={value >= max}
          onClick={() => {
            setDraft(null);
            onChange(clampWager(value + 1, min, max));
          }}
        >
          +
        </AdjustButton>
      </div>
    </div>
  );
}

function AdjustButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "border-2 border-border bg-surface px-3 py-1 font-bold hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ScoreInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="text-center">
      <span className="mb-1 block text-xs uppercase text-muted">{label}</span>
      <div className="flex items-center gap-1">
        <AdjustButton onClick={() => onChange(Math.max(0, value - 1))}>-</AdjustButton>
        <span className="w-8 text-2xl font-bold tabular-nums">{value}</span>
        <AdjustButton onClick={() => onChange(value + 1)}>+</AdjustButton>
      </div>
    </div>
  );
}
