import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  entries,
  groupMembers,
  groups,
  user,
  userActiveGroup,
} from "@/lib/db/schema";
import { competitionRanks } from "@/lib/ranking";

export const liveGroup = isNull(groups.deletedAt);

export async function getActiveGroup(userId: string) {
  const active = await db.query.userActiveGroup.findFirst({
    where: eq(userActiveGroup.userId, userId),
  });

  if (active) {
    const group = await db.query.groups.findFirst({
      where: and(eq(groups.id, active.groupId), liveGroup),
    });
    if (group) return group;
  }

  const memberships = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, userId),
    with: { group: true },
  });

  return memberships.find((m) => m.group.deletedAt == null)?.group ?? null;
}

export async function getUserGroups(userId: string) {
  const memberships = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, userId),
    with: { group: true },
  });
  return memberships
    .filter((m) => m.group.deletedAt == null)
    .map((m) => ({
      ...m.group,
      isAdmin: m.isAdmin,
      points: m.points,
    }));
}

export async function getUserGroupsWithMeta(userId: string) {
  const base = await getUserGroups(userId);
  if (base.length === 0) return [];

  const members = await db
    .select({
      groupId: groupMembers.groupId,
      userId: groupMembers.userId,
      points: groupMembers.points,
    })
    .from(groupMembers)
    .where(
      inArray(
        groupMembers.groupId,
        base.map((g) => g.id),
      ),
    )
    .orderBy(desc(groupMembers.points));

  const byGroup = new Map<string, typeof members>();
  for (const member of members) {
    const list = byGroup.get(member.groupId);
    if (list) list.push(member);
    else byGroup.set(member.groupId, [member]);
  }

  return base.map((g) => {
    const list = byGroup.get(g.id) ?? [];
    const mine = list.find((m) => m.userId === userId);
    // Competition rank: everyone tied on points shares the better position.
    const ahead = mine
      ? list.filter((m) => m.points > mine.points).length
      : list.length - 1;
    return { ...g, memberCount: list.length, rank: ahead + 1 };
  });
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
    with: { group: { columns: { deletedAt: true } } },
  });
  return member != null && member.group.deletedAt == null;
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

export type StandingRow = {
  userId: string;
  name: string;
  points: number;
  hits: number;
  misses: number;
  /** Competition rank (1, 2, 2, 4) — not the row's position in the list. */
  rank: number;
};

export async function getStandings(groupId: string): Promise<StandingRow[]> {
  const rows = await db
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
    // Name breaks the tie so equal-point members keep a stable order; without
    // it Postgres is free to return them in a different order every render.
    .orderBy(desc(groupMembers.points), asc(user.name));

  const ranks = competitionRanks(rows);
  return rows.map((row) => ({ ...row, rank: ranks.get(row.userId) ?? 0 }));
}

export async function getGroupMembers(groupId: string) {
  return db.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, groupId),
    with: { user: true },
  });
}

/** Public preview for an invite link. No membership or ids beyond the code. */
export async function getGroupInvitePreview(inviteCode: string) {
  const group = await db.query.groups.findFirst({
    where: and(eq(groups.inviteCode, inviteCode), liveGroup),
    columns: { id: true, name: true, competition: true },
  });
  if (!group) return null;

  const [row] = await db
    .select({ memberCount: count() })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, group.id));

  return {
    name: group.name,
    competition: group.competition,
    memberCount: row?.memberCount ?? 0,
  };
}
