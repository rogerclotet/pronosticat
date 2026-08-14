"use server";

import { revalidatePath } from "next/cache";
import { runScoreOnly } from "@/lib/rounds/scoring";
import {
  createDevMatch,
  deleteDevMatch,
  listDevMatches,
  listRounds,
  simulateDevRoundKickoff,
  updateDevMatch,
  type CreateDevMatchInput,
  type UpdateDevMatchInput,
} from "@/lib/dev/fixtures";
import { isDevFixturesUiEnabled } from "@/lib/dev/guard";
import type { Competition } from "@/lib/constants";

const DEV_FIXTURES_PATH = "/dev/fixtures";

function assertDevEnabled() {
  if (!isDevFixturesUiEnabled()) {
    throw new Error("Dev fixtures are disabled");
  }
}

function revalidateDevFixturesPage() {
  revalidatePath(DEV_FIXTURES_PATH);
}

export async function getDevFixturesAction(competition?: Competition) {
  assertDevEnabled();
  return listDevMatches(competition);
}

export async function createDevFixtureAction(input: CreateDevMatchInput) {
  assertDevEnabled();
  const match = await createDevMatch(input);
  revalidateDevFixturesPage();
  return match;
}

export async function updateDevFixtureAction(
  matchId: string,
  input: UpdateDevMatchInput,
  runScore = false,
) {
  assertDevEnabled();
  const match = await updateDevMatch(matchId, input);
  if (runScore) {
    await runScoreOnly();
  }
  revalidateDevFixturesPage();
  return match;
}

export async function deleteDevFixtureAction(matchId: string) {
  assertDevEnabled();
  await deleteDevMatch(matchId);
  revalidateDevFixturesPage();
}

export async function runDevScoreAction() {
  assertDevEnabled();
  await runScoreOnly();
  revalidateDevFixturesPage();
}

export async function simulateKickoffAction(matchId: string) {
  assertDevEnabled();
  const kickoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const match = await updateDevMatch(matchId, { kickoff });
  await runScoreOnly();
  revalidateDevFixturesPage();
  return match;
}

export async function getDevRoundsAction() {
  assertDevEnabled();
  return listRounds();
}

export async function simulateRoundKickoffAction(
  competition: Competition,
  matchday: number,
) {
  assertDevEnabled();
  await simulateDevRoundKickoff(competition, matchday);
  await runScoreOnly();
  revalidateDevFixturesPage();
}

export async function finishMatchAction(
  matchId: string,
  homeScore: number,
  awayScore: number,
) {
  assertDevEnabled();
  const match = await updateDevMatch(matchId, {
    status: "finished",
    homeScore,
    awayScore,
  });
  await runScoreOnly();
  revalidateDevFixturesPage();
  return match;
}
