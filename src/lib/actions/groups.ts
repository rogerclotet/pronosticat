"use server";

import { eq, and, desc, sql, count, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groups,
  groupMembers,
  matches,
  predictions,
  userActiveGroup,
  user,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import {
  COMPETITIONS,
  generateId,
  generateInviteCode,
  POINTS,
  type Competition,
} from "@/lib/constants";
import {
  fetchCompetitionMatches,
  mapMatchStatus,
} from "@/lib/football/api";
import { getCurrentRoundMatches as fetchCurrentRoundMatches } from "@/lib/queries/matches";
import { revalidatePath, revalidateTag } from "next/cache";

export async function getActiveGroup(userId: string) {
  const active = await db.query.userActiveGroup.findFirst({
    where: eq(userActiveGroup.userId, userId),
  });

  if (active) {
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, active.groupId),
    });
    if (group) return group;
  }

  const membership = await db.query.groupMembers.findFirst({
    where: eq(groupMembers.userId, userId),
    with: { group: true },
  });

  return membership?.group ?? null;
}

export async function getUserGroups(userId: string) {
  const memberships = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, userId),
    with: { group: true },
  });
  return memberships.map((m) => ({ ...m.group, isAdmin: m.isAdmin, points: m.points }));
}

export async function getUserGroupsWithMeta(userId: string) {
  const base = await getUserGroups(userId);
  return Promise.all(
    base.map(async (g) => {
      const members = await db
        .select({ userId: groupMembers.userId, points: groupMembers.points })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, g.id))
        .orderBy(desc(groupMembers.points));
      const rank = members.findIndex((m) => m.userId === userId) + 1;
      return { ...g, memberCount: members.length, rank: rank || members.length };
    }),
  );
}

export async function getMemberPoints(userId: string, groupId: string) {
  const member = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.userId, userId),
      eq(groupMembers.groupId, groupId),
    ),
  });
  return member?.points ?? 0;
}

export async function createGroup(data: {
  name: string;
  competition: Competition;
  startingPoints?: number;
  maxWagerPerMatch?: number;
}) {
  const session = await requireSession();
  const id = generateId();
  const inviteCode = generateInviteCode();
  const startingPoints = data.startingPoints ?? POINTS.DEFAULT_STARTING;
  const maxWagerPerMatch = data.maxWagerPerMatch ?? POINTS.MAX_WAGER;

  await db.insert(groups).values({
    id,
    name: data.name,
    competition: data.competition,
    inviteCode,
    startingPoints,
    maxWagerPerMatch,
    createdById: session.user.id,
  });

  await db.insert(groupMembers).values({
    id: generateId(),
    groupId: id,
    userId: session.user.id,
    points: startingPoints,
    isAdmin: true,
  });

  await setActiveGroup(id);
  revalidatePath("/");
  return { id, inviteCode };
}

export async function updateGroupSettings(data: {
  groupId: string;
  maxWagerPerMatch: number;
}) {
  const session = await requireSession();

  const member = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.userId, session.user.id),
      eq(groupMembers.groupId, data.groupId),
      eq(groupMembers.isAdmin, true),
    ),
  });
  if (!member) throw new Error("Not authorized");
  if (data.maxWagerPerMatch < POINTS.MIN_WAGER) {
    throw new Error("Invalid max wager");
  }

  await db
    .update(groups)
    .set({ maxWagerPerMatch: data.maxWagerPerMatch, updatedAt: new Date() })
    .where(eq(groups.id, data.groupId));

  revalidatePath("/");
}

export async function joinGroup(inviteCode: string) {
  const session = await requireSession();
  const group = await db.query.groups.findFirst({
    where: eq(groups.inviteCode, inviteCode.toUpperCase()),
  });

  if (!group) throw new Error("Group not found");

  const existing = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, session.user.id),
    ),
  });

  if (!existing) {
    await db.insert(groupMembers).values({
      id: generateId(),
      groupId: group.id,
      userId: session.user.id,
      points: group.startingPoints,
      isAdmin: false,
    });
  }

  await setActiveGroup(group.id);
  revalidatePath("/");
  return group;
}

export async function setActiveGroup(groupId: string) {
  const session = await requireSession();

  await db
    .insert(userActiveGroup)
    .values({ userId: session.user.id, groupId })
    .onConflictDoUpdate({
      target: userActiveGroup.userId,
      set: { groupId },
    });

  revalidatePath("/");
}

export async function syncMatches(competition: Competition) {
  const config = COMPETITIONS[competition];
  const apiMatches = await fetchCompetitionMatches(config.footballDataCode);

  for (const m of apiMatches) {
    const id = `${competition}-${m.id}`;
    await db
      .insert(matches)
      .values({
        id,
        externalId: m.id,
        competition,
        homeTeam: m.homeTeam.shortName ?? m.homeTeam.name,
        awayTeam: m.awayTeam.shortName ?? m.awayTeam.name,
        homeTeamCrest: m.homeTeam.crest,
        awayTeamCrest: m.awayTeam.crest,
        homeScore: m.score.fullTime.home,
        awayScore: m.score.fullTime.away,
        matchday: m.matchday ?? 1,
        status: mapMatchStatus(m.status),
        kickoff: new Date(m.utcDate),
      })
      .onConflictDoUpdate({
        target: [matches.externalId, matches.competition],
        set: {
          homeScore: m.score.fullTime.home,
          awayScore: m.score.fullTime.away,
          status: mapMatchStatus(m.status),
          updatedAt: new Date(),
        },
      });
  }

  revalidateTag("matches", "max");
}

/** Server action wrapper for client components (e.g. rival sheet). */
export async function getCurrentRoundMatches(competition: Competition) {
  return fetchCurrentRoundMatches(competition);
}

export async function getUserPredictions(
  userId: string,
  groupId: string,
  matchIds: string[],
) {
  if (matchIds.length === 0) return [];
  return db.query.predictions.findMany({
    where: and(
      eq(predictions.userId, userId),
      eq(predictions.groupId, groupId),
      inArray(predictions.matchId, matchIds),
    ),
  });
}

export async function savePrediction(data: {
  groupId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  wager: number;
}) {
  const session = await requireSession();

  const group = await db.query.groups.findFirst({
    where: eq(groups.id, data.groupId),
  });
  if (!group) throw new Error("Group not found");
  if (data.wager < POINTS.MIN_WAGER || data.wager > group.maxWagerPerMatch) {
    throw new Error("Invalid wager");
  }

  const match = await db.query.matches.findFirst({
    where: eq(matches.id, data.matchId),
  });
  if (!match) throw new Error("Match not found");
  if (match.status !== "scheduled") throw new Error("Match already started");
  if (new Date() >= match.kickoff) throw new Error("Match already started");

  const member = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.userId, session.user.id),
      eq(groupMembers.groupId, data.groupId),
    ),
  });
  if (!member) throw new Error("Not a group member");
  if (member.points < data.wager) throw new Error("Insufficient points");

  const existing = await db.query.predictions.findFirst({
    where: and(
      eq(predictions.userId, session.user.id),
      eq(predictions.groupId, data.groupId),
      eq(predictions.matchId, data.matchId),
    ),
  });

  if (existing) {
    await db
      .update(predictions)
      .set({
        homeScore: data.homeScore,
        awayScore: data.awayScore,
        wager: data.wager,
        updatedAt: new Date(),
      })
      .where(eq(predictions.id, existing.id));
  } else {
    await db.insert(predictions).values({
      id: generateId(),
      userId: session.user.id,
      groupId: data.groupId,
      matchId: data.matchId,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      wager: data.wager,
    });
  }

  revalidatePath("/predictions");
  revalidatePath("/");
  revalidateTag("predictions", "max");
}

export async function deletePrediction(predictionId: string) {
  const session = await requireSession();
  const prediction = await db.query.predictions.findFirst({
    where: eq(predictions.id, predictionId),
    with: { match: true },
  });

  if (!prediction || prediction.userId !== session.user.id) {
    throw new Error("Not found");
  }
  if (prediction.lockedAt || prediction.match.status !== "scheduled") {
    throw new Error("Cannot delete locked prediction");
  }

  await db.delete(predictions).where(eq(predictions.id, predictionId));
  revalidatePath("/predictions");
  revalidatePath("/");
  revalidateTag("predictions", "max");
}

export async function getStandings(groupId: string) {
  const members = await db
    .select({
      userId: groupMembers.userId,
      name: user.name,
      points: groupMembers.points,
      matchesPredicted: count(predictions.id),
      correctResults: sql<number>`count(case when ${predictions.pointsAwarded} >= ${predictions.wager} * ${POINTS.EXACT_RESULT_MULTIPLIER} then 1 end)`,
      correctOutcomes: sql<number>`count(case when ${predictions.pointsAwarded} > 0 and ${predictions.pointsAwarded} < ${predictions.wager} * ${POINTS.EXACT_RESULT_MULTIPLIER} then 1 end)`,
    })
    .from(groupMembers)
    .innerJoin(user, eq(groupMembers.userId, user.id))
    .leftJoin(
      predictions,
      and(
        eq(predictions.userId, groupMembers.userId),
        eq(predictions.groupId, groupId),
      ),
    )
    .where(eq(groupMembers.groupId, groupId))
    .groupBy(groupMembers.userId, user.name, groupMembers.points)
    .orderBy(desc(groupMembers.points));

  return members;
}

export async function getHomeSummary(userId: string, groupId: string) {
  const points = await getMemberPoints(userId, groupId);
  const activePredictions = await db
    .select({ count: count() })
    .from(predictions)
    .innerJoin(matches, eq(predictions.matchId, matches.id))
    .where(
      and(
        eq(predictions.userId, userId),
        eq(predictions.groupId, groupId),
        eq(matches.status, "scheduled"),
      ),
    );

  const recentResults = await db.query.predictions.findMany({
    where: and(
      eq(predictions.userId, userId),
      eq(predictions.groupId, groupId),
    ),
    with: { match: true },
    orderBy: [desc(predictions.updatedAt)],
    limit: 5,
  });

  return {
    points,
    activePredictions: activePredictions[0]?.count ?? 0,
    recentResults: recentResults.filter((p) => p.match.status === "finished"),
  };
}

export async function getGroupMembers(groupId: string) {
  return db.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, groupId),
    with: { user: true },
  });
}
