"use client";

import { useTranslations } from "next-intl";
import {
  type BoardMatch,
  teamCrest,
  teamName,
} from "@/components/challenges/types";
import type { TargetSide } from "@/lib/challenges/types";
import { MAX_PREDICTED_SCORE } from "@/lib/constants";
import { cn, formatKickoff, teamCode } from "@/lib/utils";

export function MatchPicker({
  matches,
  selectedId,
  onSelect,
  teamsInUse = EMPTY_TEAMS_IN_USE,
}: {
  matches: BoardMatch[];
  selectedId: string | null;
  onSelect: (matchId: string) => void;
  teamsInUse?: Map<string, string>;
}) {
  const t = useTranslations("sheet");

  return (
    <div className="flex flex-col gap-1.5">
      {matches.map((match) => {
        const takenTeam = teamsInUse.has(match.homeTeam)
          ? match.homeTeam
          : teamsInUse.has(match.awayTeam)
            ? match.awayTeam
            : null;
        const disabled = takenTeam !== null;

        return (
          <div key={match.id} className="flex flex-col gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(match.id)}
              className={cn(
                "flex items-center justify-between gap-2.5 border-2 px-2.5 py-2.5 text-left",
                disabled
                  ? "border-border bg-surface opacity-50"
                  : match.id === selectedId
                    ? "border-teal bg-highlight-bg"
                    : "border-border bg-surface",
              )}
            >
              <span className="font-sans text-[12.5px] font-semibold">
                {match.homeTeam} – {match.awayTeam}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.09em] text-muted">
                {formatKickoff(new Date(match.kickoff))}
              </span>
            </button>
            {takenTeam && (
              <p className="px-0.5 font-sans text-[10px] leading-snug text-text-secondary">
                {t("teamTakenNote", {
                  team: takenTeam,
                  challenge: teamsInUse.get(takenTeam)!,
                })}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

const EMPTY_TEAMS_IN_USE: Map<string, string> = new Map();

export function TeamPicker({
  matches,
  selectedMatchId,
  selectedSide,
  onSelect,
  requiredSide,
  teamsInUse = EMPTY_TEAMS_IN_USE,
}: {
  matches: BoardMatch[];
  selectedMatchId: string | null;
  selectedSide: TargetSide | null;
  onSelect: (matchId: string, side: TargetSide) => void;
  /** When set, only that side of each fixture can be picked. */
  requiredSide?: TargetSide;
  teamsInUse?: Map<string, string>;
}) {
  const t = useTranslations("sheet");
  const sides = requiredSide
    ? ([requiredSide] as const)
    : (["home", "away"] as const);

  return (
    <div className="flex flex-col gap-1.5">
      {matches.map((match) => (
        <div key={match.id} className="flex flex-col gap-1">
          <div className="flex">
            {sides.map((side, i) => {
              const selected =
                match.id === selectedMatchId && side === selectedSide;
              const name = teamName(match, side);
              const disabled = teamsInUse.has(name);
              return (
                <button
                  key={side}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(match.id, side)}
                  className={cn(
                    "flex flex-1 items-center gap-2 border-2 px-2 py-2.5 text-left",
                    // Collapse the shared border between adjacent sides.
                    i > 0 && "-ml-0.5",
                    selected && "relative z-10",
                    disabled
                      ? "border-border bg-surface opacity-50"
                      : selected
                        ? "border-teal bg-highlight-bg"
                        : "border-border bg-surface",
                  )}
                >
                  <TeamMark match={match} side={side} />
                  <span className="font-sans text-[12px] font-semibold leading-tight">
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
          {sides.map((side) => {
            const name = teamName(match, side);
            const challenge = teamsInUse.get(name);
            return challenge ? (
              <p
                key={side}
                className="px-0.5 font-sans text-[10px] leading-snug text-text-secondary"
              >
                {t("teamTakenNote", { team: name, challenge })}
              </p>
            ) : null;
          })}
        </div>
      ))}
    </div>
  );
}

function TeamMark({ match, side }: { match: BoardMatch; side: TargetSide }) {
  const crest = teamCrest(match, side);
  if (!crest) {
    return (
      <span className="w-[26px] shrink-0 text-center font-mono text-[10px] font-bold text-text-secondary">
        {teamCode(teamName(match, side))}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={crest}
      alt=""
      className="h-[26px] w-[26px] shrink-0 object-contain"
    />
  );
}

export function ScorePicker({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  onChange,
}: {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  onChange: (home: number, away: number) => void;
}) {
  const t = useTranslations("sheet");

  return (
    <div className="border-2 border-border bg-surface p-3.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
        <ScoreStepper
          label={t("local")}
          team={homeTeam}
          value={homeScore}
          onChange={(v) => onChange(v, awayScore)}
        />
        <span className="font-mono text-xl font-bold text-muted">–</span>
        <ScoreStepper
          label={t("visitant")}
          team={awayTeam}
          value={awayScore}
          onChange={(v) => onChange(homeScore, v)}
        />
      </div>
    </div>
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
      <span
        className="min-h-[29px] text-center font-sans text-xs font-semibold leading-tight"
        title={label}
      >
        {team}
      </span>
      <span className="font-mono text-3xl font-bold text-teal">{value}</span>
      <div className="flex">
        <StepButton onClick={() => onChange(Math.max(0, value - 1))}>
          −
        </StepButton>
        <StepButton
          onClick={() => onChange(Math.min(MAX_PREDICTED_SCORE, value + 1))}
          className="-ml-0.5"
        >
          +
        </StepButton>
      </div>
    </div>
  );
}

export function NumberPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 border-2 border-border bg-surface p-3.5">
      <StepButton onClick={() => onChange(Math.max(0, value - 1))}>
        −
      </StepButton>
      <span className="min-w-[64px] text-center font-mono text-3xl font-bold text-teal">
        {value}
      </span>
      <StepButton onClick={() => onChange(value + 1)}>+</StepButton>
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
