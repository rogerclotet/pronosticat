"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { COMPETITIONS, type Competition } from "@/lib/constants";
import {
  createDevFixtureAction,
  deleteDevFixtureAction,
  finishMatchAction,
  runDevScoreAction,
  simulateKickoffAction,
  updateDevFixtureAction,
} from "@/lib/dev/actions";
import { cn, formatKickoff } from "@/lib/utils";

type DevMatch = {
  id: string;
  competition: Competition;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  matchday: number;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
  kickoff: Date;
};

type DevFixturesAdminProps = {
  initialMatches: DevMatch[];
};

const COMPETITION_OPTIONS = Object.keys(COMPETITIONS) as Competition[];

const COMPETITION_LABELS: Record<Competition, string> = {
  laliga: "LaLiga",
  premier_league: "Premier League",
  champions_league: "Champions League",
};

function toDatetimeLocalValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function statusTone(
  status: DevMatch["status"],
): "open" | "live" | "muted" | "danger" {
  if (status === "scheduled") return "open";
  if (status === "live") return "live";
  if (status === "finished") return "muted";
  return "danger";
}

export function DevFixturesAdmin({ initialMatches }: DevFixturesAdminProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<Competition | "all">("all");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [createForm, setCreateForm] = useState({
    competition: "laliga" as Competition,
    homeTeam: "Equip A",
    awayTeam: "Equip B",
    matchday: "1",
    kickoff: "",
  });

  const filteredMatches = useMemo(
    () =>
      filter === "all"
        ? initialMatches
        : initialMatches.filter((match) => match.competition === filter),
    [filter, initialMatches],
  );

  function notify(nextMessage: string) {
    setMessage(nextMessage);
    setError(null);
  }

  function notifyError(nextError: string) {
    setError(nextError);
    setMessage(null);
  }

  function runAction(action: () => Promise<void>, successMessage?: string) {
    startTransition(async () => {
      try {
        await action();
        if (successMessage) notify(successMessage);
        router.refresh();
      } catch (err) {
        notifyError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2 border-b-2 border-border pb-4">
        <p className="label-mono">Development only</p>
        <h1 className="text-2xl font-extrabold uppercase tracking-wide">
          Dev Fixtures
        </h1>
        <p className="text-sm text-text-secondary">
          Create fake matches, simulate kickoff, set results, and run wager
          scoring without curl or football-data.org.
        </p>
      </header>

      {(message || error) && (
        <Card
          padding="sm"
          className={cn(
            "font-mono text-sm",
            error ? "border-danger text-danger" : "border-teal text-teal",
          )}
        >
          {error ?? message}
        </Card>
      )}

      <Card className="flex flex-col gap-4">
        <h2 className="font-bold uppercase tracking-wide">Create fixture</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Competition">
            <Select
              value={createForm.competition}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  competition: value as Competition,
                }))
              }
              options={COMPETITION_OPTIONS.map((value) => ({
                value,
                label: COMPETITION_LABELS[value],
              }))}
            />
          </Field>

          <Field label="Matchday">
            <Input
              type="number"
              min={1}
              value={createForm.matchday}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  matchday: event.target.value,
                }))
              }
            />
          </Field>

          <Field label="Home team">
            <Input
              value={createForm.homeTeam}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  homeTeam: event.target.value,
                }))
              }
            />
          </Field>

          <Field label="Away team">
            <Input
              value={createForm.awayTeam}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  awayTeam: event.target.value,
                }))
              }
            />
          </Field>

          <Field label="Kickoff (optional, defaults to +1h)" className="sm:col-span-2">
            <Input
              type="datetime-local"
              value={createForm.kickoff}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  kickoff: event.target.value,
                }))
              }
            />
          </Field>
        </div>

        <Button
          disabled={isPending}
          onClick={() =>
            runAction(async () => {
              await createDevFixtureAction({
                competition: createForm.competition,
                homeTeam: createForm.homeTeam.trim(),
                awayTeam: createForm.awayTeam.trim(),
                matchday: Number(createForm.matchday) || 1,
                kickoff: createForm.kickoff
                  ? new Date(createForm.kickoff).toISOString()
                  : undefined,
              });
            }, `Created ${createForm.homeTeam} vs ${createForm.awayTeam}`)
          }
        >
          Create fixture
        </Button>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-mono">Filter</span>
          <Select
            value={filter}
            onChange={(value) => setFilter(value as Competition | "all")}
            options={[
              { value: "all", label: "All competitions" },
              ...COMPETITION_OPTIONS.map((value) => ({
                value,
                label: COMPETITION_LABELS[value],
              })),
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={() =>
              runAction(async () => {
                await runDevScoreAction();
              }, "Scoring run completed")
            }
          >
            Run scoring
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => router.refresh()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {filteredMatches.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No dev fixtures yet. Create one above, then place a prediction in
            the app.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredMatches.map((match) => (
            <FixtureCard
              key={`${match.id}-${match.status}-${match.kickoff.toISOString()}-${match.homeScore}-${match.awayScore}`}
              match={match}
              disabled={isPending}
              onAction={runAction}
              onError={notifyError}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FixtureCard({
  match,
  disabled,
  onAction,
  onError,
}: {
  match: DevMatch;
  disabled: boolean;
  onAction: (action: () => Promise<void>, successMessage?: string) => void;
  onError: (message: string) => void;
}) {
  const [homeScore, setHomeScore] = useState(String(match.homeScore ?? 2));
  const [awayScore, setAwayScore] = useState(String(match.awayScore ?? 1));
  const [kickoff, setKickoff] = useState(toDatetimeLocalValue(match.kickoff));

  const showScore = match.status === "finished" || match.status === "live";

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="label-mono">{COMPETITION_LABELS[match.competition]}</p>
          <h3 className="text-lg font-extrabold">
            {match.homeTeam} vs {match.awayTeam}
          </h3>
          <p className="font-mono text-xs text-muted">
            J{match.matchday} · {formatKickoff(match.kickoff)}
          </p>
          <p className="break-all font-mono text-[10px] text-muted">{match.id}</p>
        </div>
        <Pill tone={statusTone(match.status)}>{match.status}</Pill>
      </div>

      <div className="flex items-center justify-center border-2 border-border bg-background px-4 py-3 font-mono text-xl font-bold">
        {showScore
          ? `${match.homeScore ?? "-"} - ${match.awayScore ?? "-"}`
          : "vs"}
      </div>

      <Field label="Kickoff">
        <Input
          type="datetime-local"
          value={kickoff}
          onChange={(event) => setKickoff(event.target.value)}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() =>
            onAction(
              async () => {
                await updateDevFixtureAction(
                  match.id,
                  { kickoff: new Date(kickoff).toISOString() },
                  false,
                );
              },
              `Updated kickoff for ${match.homeTeam} vs ${match.awayTeam}`,
            )
          }
        >
          Save kickoff
        </Button>

        <Button
          size="sm"
          disabled={disabled || match.status !== "scheduled"}
          onClick={() =>
            onAction(
              async () => {
                await simulateKickoffAction(match.id);
              },
              `Kickoff simulated for ${match.homeTeam} vs ${match.awayTeam}`,
            )
          }
        >
          Simulate kickoff
        </Button>

        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() =>
            onAction(
              async () => {
                await updateDevFixtureAction(match.id, { status: "live" }, true);
              },
              `Marked live for ${match.homeTeam} vs ${match.awayTeam}`,
            )
          }
        >
          Set live
        </Button>
      </div>

      <div className="grid gap-3 border-t-2 border-border pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Home score">
          <Input
            type="number"
            min={0}
            value={homeScore}
            onChange={(event) => setHomeScore(event.target.value)}
          />
        </Field>
        <Field label="Away score">
          <Input
            type="number"
            min={0}
            value={awayScore}
            onChange={(event) => setAwayScore(event.target.value)}
          />
        </Field>
        <Button
          disabled={disabled}
          onClick={() => {
            const home = Number(homeScore);
            const away = Number(awayScore);
            if (!Number.isFinite(home) || !Number.isFinite(away)) {
              onError("Scores must be valid numbers");
              return;
            }
            onAction(
              async () => {
                await finishMatchAction(match.id, home, away);
              },
              `Finished ${match.homeTeam} ${home}-${away} ${match.awayTeam}`,
            );
          }}
        >
          Finish & score
        </Button>
      </div>

      <div className="flex justify-end border-t-2 border-border pt-4">
        <Button
          variant="danger"
          size="sm"
          disabled={disabled}
          onClick={() => {
            if (!window.confirm(`Delete ${match.homeTeam} vs ${match.awayTeam}?`)) {
              return;
            }
            onAction(
              async () => {
                await deleteDevFixtureAction(match.id);
              },
              `Deleted ${match.homeTeam} vs ${match.awayTeam}`,
            );
          }}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="label-mono">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="w-full border-2 border-border bg-background px-4 py-2 text-foreground focus:border-teal focus:outline-none disabled:opacity-50"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
