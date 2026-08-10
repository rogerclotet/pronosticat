"use server";

import { eq, and, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  entries,
  groups,
  groupMembers,
  matches,
  roundChallenges,
  userActiveGroup,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import {
  COMPETITIONS,
  generateId,
  generateInviteCode,
  POINTS,
  type Competition,
} from "@/lib/constants";
import { getChallenge } from "@/lib/challenges/registry";
import {
  normalizeTarget,
  teamsClaimed,
  type EntryInput,
} from "@/lib/challenges/validate";
import { getUserGroupsWithMeta } from "@/lib/queries/groups";
import { revalidatePath } from "next/cache";

/**
 * Every export of this module is a public RPC endpoint, so nothing here may
 * take a caller-supplied user id: the actor is always the session user.
 */

export async function getMyGroups() {
  const session = await requireSession();
  return getUserGroupsWithMeta(session.user.id);
}

const MAX_GROUP_NAME_LENGTH = 60;
const MAX_STARTING_POINTS = 1_000_000;

export async function createGroup(data: {
  name: string;
  competition: Competition;
  startingPoints?: number;
}) {
  const session = await requireSession();

  const name = data.name.trim();
  if (!name || name.length > MAX_GROUP_NAME_LENGTH) {
    throw new Error("Invalid group name");
  }
  if (!(data.competition in COMPETITIONS)) {
    throw new Error("Unknown competition");
  }

  const startingPoints = data.startingPoints ?? POINTS.DEFAULT_STARTING;
  if (
    !Number.isInteger(startingPoints) ||
    startingPoints < 0 ||
    startingPoints > MAX_STARTING_POINTS
  ) {
    throw new Error("Invalid starting points");
  }

  const id = generateId();
  const inviteCode = generateInviteCode();

  await db.insert(groups).values({
    id,
    name,
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

  const member = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.userId, session.user.id),
      eq(groupMembers.groupId, groupId),
    ),
    columns: { id: true },
  });
  if (!member) throw new Error("Not a group member");

  await db
    .insert(userActiveGroup)
    .values({ userId: session.user.id, groupId })
    .onConflictDoUpdate({
      target: userActiveGroup.userId,
      set: { groupId },
    });

  revalidatePath("/");
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
    with: { group: true },
  });
  if (!member) throw new Error("Not a group member");

  // A group only ever plays its own competition's board.
  if (member.group.competition !== round.competition) {
    throw new Error("Round is not part of this group's competition");
  }

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

    const teams = teamsClaimed(challenge.targetKind, target, match);
    if (teams.length > 0) {
      await assertTeamsFree(session.user.id, data.groupId, round.id, slot.id, teams);
    }
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

/**
 * A team can only anchor one pick per round: picking a whole match commits
 * both its teams, so it clashes with any other pick anchored to either side.
 */
async function assertTeamsFree(
  userId: string,
  groupId: string,
  roundId: string,
  slotId: string,
  teams: string[],
) {
  const others = await db.query.entries.findMany({
    where: and(
      eq(entries.userId, userId),
      eq(entries.groupId, groupId),
      eq(entries.roundId, roundId),
      ne(entries.roundChallengeId, slotId),
    ),
    with: { roundChallenge: true, targetMatch: true },
  });

  for (const other of others) {
    if (!other.targetMatch) continue;
    const otherChallenge = getChallenge(other.roundChallenge.slug);
    if (!otherChallenge) continue;

    const otherTeams = teamsClaimed(
      otherChallenge.targetKind,
      other,
      other.targetMatch,
    );
    const clash = teams.find((team) => otherTeams.includes(team));
    if (clash) {
      throw new Error(`${clash} is already picked in another challenge this round`);
    }
  }
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
}
