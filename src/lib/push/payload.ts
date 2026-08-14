import { formatKickoff, formatOrdinal } from "@/lib/utils";
import messages from "../../../messages/ca.json";
import type { PushPayload } from "./types";

const TITLE = "Pronosticat";

export function challengeName(slug: string): string {
  const row = (messages.challenges as Record<string, { name: string }>)[slug];
  return row?.name ?? slug;
}

export function formatRemaining(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) {
    return minutes === 1 ? "1 minut" : `${minutes} minuts`;
  }
  const hours = Math.max(1, Math.round(minutes / 60));
  return hours === 1 ? "1 hora" : `${hours} hores`;
}

export function signedPoints(points: number): string {
  return points >= 0 ? `+${points}` : `${points}`;
}

export function deadlinePayload(input: {
  missingSlots: number;
  remainingMs: number;
  competitionLabel: string;
}): PushPayload {
  const remaining = formatRemaining(input.remainingMs);
  const body =
    input.missingSlots <= 0
      ? `${input.competitionLabel} tanca d'aquí ${remaining}.`
      : input.missingSlots === 1
        ? `Et queda 1 casella i ${input.competitionLabel} tanca d'aquí ${remaining}.`
        : `Et queden ${input.missingSlots} caselles i ${input.competitionLabel} tanca d'aquí ${remaining}.`;

  return {
    title: TITLE,
    body,
    url: "/",
    tag: "deadline",
    urgency: "high",
  };
}

export function matchFinishedPayload(input: {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  matchId: string;
}): PushPayload {
  return {
    title: TITLE,
    body: `${input.homeTeam} ${input.homeScore}–${input.awayScore} ${input.awayTeam}. Mira si has encertat.`,
    url: "/jornada",
    tag: `match-${input.matchId}`,
  };
}

export function roundSettledPayload(input: {
  matchday: number;
  groupName: string;
  points: number;
  groupId: string;
}): PushPayload {
  return {
    title: TITLE,
    body: `${input.groupName} · jornada ${input.matchday} liquidada: ${signedPoints(input.points)} punts.`,
    url: "/",
    tag: `round-${input.groupId}-${input.matchday}`,
  };
}

export function roundOpenPayload(input: {
  matchday: number;
  competitionLabel: string;
  roundId: string;
}): PushPayload {
  return {
    title: TITLE,
    body: `Ja tens el tauler de la jornada ${input.matchday} · ${input.competitionLabel}. Encara no has mogut fitxa.`,
    url: "/",
    tag: `round-open-${input.roundId}`,
  };
}

export function jokerUnusedPayload(input: {
  remainingMs: number;
  competitionLabel: string;
}): PushPayload {
  return {
    title: TITLE,
    body: `Tauler ple, jòquer al banc. ${input.competitionLabel} tanca d'aquí ${formatRemaining(input.remainingMs)}.`,
    url: "/",
    tag: "joker",
    urgency: "high",
  };
}

export function onlyOneEmptyPayload(input: {
  groupName: string;
  remainingMs: number;
}): PushPayload {
  return {
    title: TITLE,
    body: `A ${input.groupName} ets l'únic que no ha acabat el tauler. Tanca d'aquí ${formatRemaining(input.remainingMs)}.`,
    url: "/",
    tag: "only-one",
    urgency: "high",
  };
}

export function deadlineMovedPayload(input: {
  competitionLabel: string;
  lockAt: Date;
}): PushPayload {
  return {
    title: TITLE,
    body: `Han avançat el primer partit. ${input.competitionLabel} tanca ${formatKickoff(input.lockAt)}.`,
    url: "/",
    tag: "deadline-moved",
    urgency: "high",
  };
}

export function matchKickedOffPayload(input: {
  homeTeam: string;
  awayTeam: string;
  challengeSlug: string;
  matchId: string;
}): PushPayload {
  return {
    title: TITLE,
    body: `${input.homeTeam}–${input.awayTeam} ja ha començat. La teva jugada a ${challengeName(input.challengeSlug)} està en joc.`,
    url: "/jornada",
    tag: `kickoff-${input.matchId}`,
  };
}

export function halfTimePayload(input: {
  homeTeam: string;
  awayTeam: string;
  homeScoreHt: number;
  awayScoreHt: number;
  slug: string;
  predictedHome: number | null;
  predictedAway: number | null;
  matchId: string;
}): PushPayload {
  const score = `${input.homeTeam} ${input.homeScoreHt}–${input.awayScoreHt} ${input.awayTeam}`;
  let body: string;
  if (
    input.slug === "exact_score" &&
    input.predictedHome !== null &&
    input.predictedAway !== null
  ) {
    body = `Descans ${score}. Tu vas a ${input.predictedHome}–${input.predictedAway}.`;
  } else if (input.slug === "comeback") {
    body =
      input.homeScoreHt === input.awayScoreHt
        ? `Descans ${score}. Empat: la remuntada no s'activa.`
        : `Descans ${score}. La remuntada encara es pot cuinar.`;
  } else {
    body = `Descans ${score}.`;
  }

  return {
    title: TITLE,
    body,
    url: "/jornada",
    tag: `ht-${input.matchId}`,
  };
}

export function pickLiveSwingPayload(input: {
  slug: string;
  teamOrMatch: string;
  scoreline: string;
  winning: boolean;
  entryId: string;
}): PushPayload {
  const name = challengeName(input.slug);
  const body = input.winning
    ? `${name} aguanta: ${input.teamOrMatch} (${input.scoreline}).`
    : `${name} penca: ${input.teamOrMatch} (${input.scoreline}).`;
  return {
    title: TITLE,
    body,
    url: "/jornada",
    tag: `swing-${input.entryId}`,
  };
}

export function pickVoidedPayload(input: {
  homeTeam: string;
  awayTeam: string;
  challengeSlug: string;
  matchId: string;
}): PushPayload {
  return {
    title: TITLE,
    body: `${input.homeTeam}–${input.awayTeam} s'ha ajornat. La teva casella de ${challengeName(input.challengeSlug)} queda anul·lada.`,
    url: "/",
    tag: `void-${input.matchId}`,
  };
}

export function exactScoreHitPayload(input: {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  isJoker: boolean;
  matchId: string;
}): PushPayload {
  const score = `${input.homeTeam} ${input.homeScore}–${input.awayScore} ${input.awayTeam}`;
  const body = input.isJoker
    ? `Has clavat la porra amb jòquer! ${score}.`
    : `Has clavat la porra! ${score}.`;
  return {
    title: TITLE,
    body,
    url: "/",
    tag: `porra-${input.matchId}`,
  };
}

export function bankerMissedPayload(input: {
  team: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  points: number;
  matchId: string;
}): PushPayload {
  return {
    title: TITLE,
    body: `El segur ha fallat: ${input.team} no ha guanyat (${input.homeTeam} ${input.homeScore}–${input.awayScore} ${input.awayTeam}). ${signedPoints(input.points)} punts.`,
    url: "/",
    tag: `banker-${input.matchId}`,
  };
}

export function rankChangePayload(input: {
  groupName: string;
  groupId: string;
  matchday: number;
  newRank: number;
  overtookName: string | null;
  overtakenByName: string | null;
}): PushPayload {
  const place = formatOrdinal(input.newRank);
  let body: string;
  if (input.overtookName) {
    body = `Has avançat ${input.overtookName} a ${input.groupName}. Ara ets ${place}.`;
  } else if (input.overtakenByName) {
    body = `${input.overtakenByName} t'ha avançat a ${input.groupName}. Ara ets ${place}.`;
  } else {
    body = `Ara ets ${place} a ${input.groupName}.`;
  }
  return {
    title: TITLE,
    body,
    url: "/group",
    tag: `rank-${input.groupId}-${input.matchday}`,
  };
}

export function tableExtremePayload(input: {
  groupName: string;
  groupId: string;
  matchday: number;
  points: number;
  place: "first" | "last";
}): PushPayload {
  const body =
    input.place === "first"
      ? `Et poses primer a ${input.groupName} (${input.points} pts).`
      : `Quedes últim a ${input.groupName} (${input.points} pts). Encara hi ha jornada.`;
  return {
    title: TITLE,
    body,
    url: "/group",
    tag: `table-${input.groupId}-${input.matchday}`,
  };
}

export function streakPayload(input: {
  groupName: string;
  groupId: string;
  roundId: string;
  streak: number;
  broke: boolean;
}): PushPayload {
  const body = input.broke
    ? `S'ha trencat la ratxa de ${input.streak} a ${input.groupName}.`
    : `Portes ${input.streak} jornades seguides encertant a ${input.groupName}.`;
  return {
    title: TITLE,
    body,
    url: "/",
    tag: `streak-${input.groupId}-${input.roundId}`,
  };
}

export function memberJoinedPayload(input: {
  joinerName: string;
  groupName: string;
  groupId: string;
  joinerId: string;
}): PushPayload {
  return {
    title: TITLE,
    body: `${input.joinerName} s'ha apuntat a ${input.groupName}.`,
    url: "/group",
    tag: `join-${input.groupId}-${input.joinerId}`,
  };
}

export function adminEmptyPicksPayload(input: {
  groupName: string;
  remainingMs: number;
  names: string[];
}): PushPayload {
  const remaining = formatRemaining(input.remainingMs);
  const body =
    input.names.length === 1
      ? `A ${input.groupName}, ${input.names[0]} encara no ha posat cap jugada. Tanca d'aquí ${remaining}.`
      : `A ${input.groupName}, ${input.names.length} jugadors no han omplert el tauler. Tanca d'aquí ${remaining}.`;
  return {
    title: TITLE,
    body,
    url: "/group",
    tag: "admin-empty",
    urgency: "high",
  };
}

export function titleRacePayload(input: {
  groupName: string;
  groupId: string;
  remaining: number;
  leaderName: string;
  leaderPoints: number;
  secondName: string;
  gap: number;
}): PushPayload {
  const body =
    input.remaining === 1
      ? `Última jornada a ${input.groupName}. ${input.leaderName} mana amb ${input.gap} punts sobre ${input.secondName}.`
      : `Queden ${input.remaining} jornades a ${input.groupName}. ${input.leaderName} va primer amb ${input.leaderPoints}, ${input.secondName} a ${input.gap} punts.`;
  return {
    title: TITLE,
    body,
    url: "/group",
    tag: `title-${input.groupId}-${input.remaining}`,
  };
}
