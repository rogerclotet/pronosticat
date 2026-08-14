import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  entries,
  groups,
  groupMembers,
  user,
  userActiveGroup,
} from "@/lib/db/schema";

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
  return memberships.map((m) => ({
    ...m.group,
    isAdmin: m.isAdmin,
    points: m.points,
  }));
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

export async function isGroupMember(userId: string, groupId: string) {
  const member = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.userId, userId),
      eq(groupMembers.groupId, groupId),
    ),
    columns: { id: true },
  });
  return member != null;
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

export async function getStandings(groupId: string) {
  return db
    .select({
      userId: groupMembers.userId,
      name: user.name,
      points: groupMembers.points,
      hits: count(sql`case when ${entries.pointsAwarded} > 0 then 1 end`),
      misses: count(sql`case when ${entries.pointsAwarded} <= 0 then 1 end`),
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
