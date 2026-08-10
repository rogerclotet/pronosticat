import { and, asc, desc, eq, lt } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { matches, rounds } from "@/lib/db/schema";
import { ensureCompetitionRounds } from "@/lib/rounds/ensure";
import {
  COMPETITIONS,
  type Competition,
} from "@/lib/constants";

const DEV_EXTERNAL_ID_FLOOR = -900_000_000;

type DevMatchStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled";

export type CreateDevMatchInput = {
  competition: Competition;
  homeTeam: string;
  awayTeam: string;
  matchday?: number;
  kickoff?: string;
  homeTeamCrest?: string;
  awayTeamCrest?: string;
};

export type UpdateDevMatchInput = {
  status?: DevMatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  kickoff?: string;
};

function assertCompetition(competition: string): Competition {
  if (!(competition in COMPETITIONS)) {
    throw new Error(`Invalid competition: ${competition}`);
  }
  return competition as Competition;
}

function generateDevExternalId(): number {
  return DEV_EXTERNAL_ID_FLOOR - Math.floor(Math.random() * 100_000_000);
}

function revalidateMatchCache() {
  revalidateTag("matches", "max");
}

export async function createDevMatch(input: CreateDevMatchInput) {
  const competition = assertCompetition(input.competition);
  const externalId = generateDevExternalId();
  const kickoff = input.kickoff ? new Date(input.kickoff) : new Date(Date.now() + 60 * 60 * 1000);
  const id = `${competition}-${externalId}`;

  await db.insert(matches).values({
    id,
    externalId,
    competition,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    homeTeamCrest: input.homeTeamCrest ?? null,
    awayTeamCrest: input.awayTeamCrest ?? null,
    homeScore: null,
    awayScore: null,
    matchday: input.matchday ?? 1,
    status: "scheduled",
    kickoff,
  });

  await ensureCompetitionRounds(competition);
  revalidateMatchCache();

  return db.query.matches.findFirst({ where: eq(matches.id, id) });
}

export async function updateDevMatch(matchId: string, input: UpdateDevMatchInput) {
  const existing = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!existing) throw new Error("Match not found");
  if (existing.externalId >= 0) {
    throw new Error("Only dev fixture matches can be updated through this endpoint");
  }

  const updates: Partial<typeof matches.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.status !== undefined) updates.status = input.status;
  if (input.homeScore !== undefined) updates.homeScore = input.homeScore;
  if (input.awayScore !== undefined) updates.awayScore = input.awayScore;
  if (input.kickoff !== undefined) updates.kickoff = new Date(input.kickoff);

  await db.update(matches).set(updates).where(eq(matches.id, matchId));
  revalidateMatchCache();

  return db.query.matches.findFirst({ where: eq(matches.id, matchId) });
}

export async function deleteDevMatch(matchId: string) {
  const existing = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!existing) throw new Error("Match not found");
  if (existing.externalId >= 0) {
    throw new Error("Only dev fixture matches can be deleted through this endpoint");
  }

  await db.delete(matches).where(eq(matches.id, matchId));
  revalidateMatchCache();
}

/**
 * Drag every dev fixture of a matchday into the past at once, so a whole round
 * can be locked with one click instead of one per match.
 */
export async function simulateDevRoundKickoff(
  competition: Competition,
  matchday: number,
) {
  const kickoff = new Date(Date.now() - 60 * 60 * 1000);

  await db
    .update(matches)
    .set({ kickoff, updatedAt: new Date() })
    .where(
      and(
        lt(matches.externalId, 0),
        eq(matches.competition, competition),
        eq(matches.matchday, matchday),
      ),
    );

  revalidateMatchCache();
}

export async function listRounds() {
  return db.query.rounds.findMany({
    orderBy: [asc(rounds.competition), asc(rounds.matchday)],
    with: { challenges: true },
  });
}

export async function listDevMatches(competition?: Competition) {
  return db.query.matches.findMany({
    where: competition
      ? and(lt(matches.externalId, 0), eq(matches.competition, competition))
      : lt(matches.externalId, 0),
    orderBy: [desc(matches.kickoff)],
  });
}
