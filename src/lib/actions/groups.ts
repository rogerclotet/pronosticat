"use server";

import { eq, and, desc, sql, count, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  entries,
  groups,
  groupMembers,
  matches,
  roundChallenges,
  userActiveGroup,
  user,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import {
  generateId,
  generateInviteCode,
  POINTS,
  type Competition,
} from "@/lib/constants";
import { getChallenge } from "@/lib/challenges/registry";
import { normalizeTarget, type EntryInput } from "@/lib/challenges/validate";
import { getCurrentRoundMatches as fetchCurrentRoundMatches } from "@/lib/queries/matches";
import { getCurrentRoundBoard } from "@/lib/queries/round-board";
import { syncMatches as syncCompetitionMatches } from "@/lib/sync/run";
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
}) {
  const session = await requireSession();
  const id = generateId();
  const inviteCode = generateInviteCode();
  const startingPoints = data.startingPoints ?? POINTS.DEFAULT_STARTING;

  await db.insert(groups).values({
    id,
    name: data.name,
    competition: data.competition,
    inviteCode,
    startingPoints,
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
  name: string;
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

  const name = data.name.trim();
  if (!name) throw new Error("Invalid group name");

  await db
    .update(groups)
    .set({ name, updatedAt: new Date() })
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
  await syncCompetitionMatches(competition);
}

/** Server action wrappers for client components (e.g. rival sheet). */
export async function getCurrentRoundMatches(competition: Competition) {
  return fetchCurrentRoundMatches(competition);
}

export async function getRoundBoardForClient(competition: Competition) {
  return getCurrentRoundBoard(competition);
}

export async function getUserEntries(
  userId: string,
  groupId: string,
  roundId: string,
) {
  return db.query.entries.findMany({
    where: and(
      eq(entries.userId, userId),
      eq(entries.groupId, groupId),
      eq(entries.roundId, roundId),
    ),
    with: { roundChallenge: true, targetMatch: true },
  });
}

export type SaveEntryInput = EntryInput & {
  groupId: string;
  roundChallengeId: string;
  isJoker?: boolean;
};

export async function saveEntry(data: SaveEntryInput) {
  const session = await requireSession();

  const slot = await db.query.roundChallenges.findFirst({
    where: eq(roundChallenges.id, data.roundChallengeId),
    with: { round: true },
  });
  if (!slot) throw new Error("Challenge not found");

  const { round } = slot;
  if (round.status !== "open" || new Date() >= round.lockAt) {
    throw new Error("Round already locked");
  }

  const challenge = getChallenge(slot.slug);
  if (!challenge) throw new Error("Challenge not available");

  const member = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.userId, session.user.id),
      eq(groupMembers.groupId, data.groupId),
    ),
  });
  if (!member) throw new Error("Not a group member");

  const target = normalizeTarget(challenge.targetKind, data);
  if (target.targetMatchId) {
    const match = await db.query.matches.findFirst({
      where: and(
        eq(matches.id, target.targetMatchId),
        eq(matches.competition, round.competition),
        eq(matches.matchday, round.matchday),
      ),
    });
    if (!match) throw new Error("Match is not in this round");
  }

  const isJoker = data.isJoker ?? false;
  if (isJoker) await assertJokerFree(session.user.id, data.groupId, round.id, slot.id);

  const existing = await db.query.entries.findFirst({
    where: and(
      eq(entries.userId, session.user.id),
      eq(entries.groupId, data.groupId),
      eq(entries.roundChallengeId, slot.id),
    ),
  });

  if (existing) {
    await db
      .update(entries)
      .set({ ...target, isJoker, updatedAt: new Date() })
      .where(eq(entries.id, existing.id));
  } else {
    await db.insert(entries).values({
      id: generateId(),
      userId: session.user.id,
      groupId: data.groupId,
      roundChallengeId: slot.id,
      roundId: round.id,
      isJoker,
      ...target,
    });
  }

  revalidateEntries();
}

/** The joker is one per round: refuse rather than silently move it. */
async function assertJokerFree(
  userId: string,
  groupId: string,
  roundId: string,
  slotId: string,
) {
  const other = await db.query.entries.findFirst({
    where: and(
      eq(entries.userId, userId),
      eq(entries.groupId, groupId),
      eq(entries.roundId, roundId),
      eq(entries.isJoker, true),
      ne(entries.roundChallengeId, slotId),
    ),
  });
  if (other) throw new Error("Joker already used this round");
}

export async function deleteEntry(entryId: string) {
  const session = await requireSession();
  const entry = await db.query.entries.findFirst({
    where: eq(entries.id, entryId),
    with: { round: true },
  });

  if (!entry || entry.userId !== session.user.id) throw new Error("Not found");
  if (entry.lockedAt || entry.round.status !== "open") {
    throw new Error("Round already locked");
  }

  await db.delete(entries).where(eq(entries.id, entryId));
  revalidateEntries();
}

function revalidateEntries() {
  revalidatePath("/");
  revalidatePath("/jornada");
  revalidateTag("predictions", "max");
}

export async function getStandings(groupId: string) {
  return db
    .select({
      userId: groupMembers.userId,
      name: user.name,
      points: groupMembers.points,
      picksSettled: count(entries.id),
      hits: sql<number>`count(case when ${entries.pointsAwarded} > 0 then 1 end)`,
      misses: sql<number>`count(case when ${entries.pointsAwarded} < 0 then 1 end)`,
    })
    .from(groupMembers)
    .innerJoin(user, eq(groupMembers.userId, user.id))
    .leftJoin(
      entries,
      and(
        eq(entries.userId, groupMembers.userId),
        eq(entries.groupId, groupId),
        sql`${entries.pointsAwarded} is not null`,
      ),
    )
    .where(eq(groupMembers.groupId, groupId))
    .groupBy(groupMembers.userId, user.name, groupMembers.points)
    .orderBy(desc(groupMembers.points));
}

export async function getGroupMembers(groupId: string) {
  return db.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, groupId),
    with: { user: true },
  });
}
