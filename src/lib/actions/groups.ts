"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getChallenge } from "@/lib/challenges/registry";
import {
  type EntryInput,
  normalizeTarget,
  teamsClaimed,
} from "@/lib/challenges/validate";
import {
  COMPETITIONS,
  type Competition,
  generateId,
  generateInviteCode,
  POINTS,
} from "@/lib/constants";
import { db } from "@/lib/db";
import {
  entries,
  groupMembers,
  groups,
  matches,
  roundChallenges,
  rounds,
  userActiveGroup,
} from "@/lib/db/schema";
import { normalizeInviteCode } from "@/lib/invite";
import { notifyMemberJoined } from "@/lib/push/dispatch";
import { getUserGroupsWithMeta, liveGroup } from "@/lib/queries/groups";
import { getCurrentRound } from "@/lib/queries/matchday";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { requireSession } from "@/lib/session";

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
  assertRateLimit(`create-group:${session.user.id}`, 5, 60_000);

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

  await db.transaction(async (tx) => {
    await tx.insert(groups).values({
      id,
      name,
      competition: data.competition,
      inviteCode,
      startingPoints,
      createdById: session.user.id,
    });

    await tx.insert(groupMembers).values({
      id: generateId(),
      groupId: id,
      userId: session.user.id,
      points: startingPoints,
      isAdmin: true,
    });
  });

  await setActiveGroup(id);
  revalidatePath("/");
  return { id, inviteCode };
}

export async function deleteGroup(groupId: string) {
  const session = await requireSession();
  assertRateLimit(`delete-group:${session.user.id}`, 5, 60_000);

  const member = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.userId, session.user.id),
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.isAdmin, true),
    ),
    with: { group: { columns: { deletedAt: true } } },
  });
  if (!member || member.group.deletedAt) {
    throw new Error("Not allowed");
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(groups)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(groups.id, groupId), liveGroup))
      .returning({ id: groups.id });
    if (!updated) throw new Error("Not allowed");

    await tx
      .delete(userActiveGroup)
      .where(eq(userActiveGroup.groupId, groupId));
  });

  revalidatePath("/");
}

/**
 * An invite code is a bearer token for joining, so an admin needs a way to
 * retire one that leaked. Old links stop resolving the moment this returns.
 */
export async function rotateInviteCode(groupId: string) {
  const session = await requireSession();
  assertRateLimit(`rotate-invite:${session.user.id}`, 5, 60_000);

  const member = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.userId, session.user.id),
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.isAdmin, true),
    ),
    columns: { id: true },
    with: { group: { columns: { deletedAt: true } } },
  });
  if (!member || member.group.deletedAt) throw new Error("Not allowed");

  const inviteCode = generateInviteCode();
  const [updated] = await db
    .update(groups)
    .set({ inviteCode, updatedAt: new Date() })
    .where(and(eq(groups.id, groupId), liveGroup))
    .returning({ inviteCode: groups.inviteCode });
  if (!updated) throw new Error("Not allowed");

  revalidatePath("/");
  return { inviteCode: updated.inviteCode };
}

export async function joinGroup(inviteCode: string) {
  const session = await requireSession();
  assertRateLimit(`join-group:${session.user.id}`, 10, 60_000);

  const normalized = normalizeInviteCode(inviteCode);
  if (!normalized) throw new Error("Group not found");

  const group = await db.query.groups.findFirst({
    where: and(eq(groups.inviteCode, normalized), liveGroup),
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
    try {
      await notifyMemberJoined({
        groupId: group.id,
        groupName: group.name,
        joinerId: session.user.id,
        joinerName: session.user.name,
      });
    } catch (error) {
      console.error("[push] member joined notify failed:", error);
    }
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
    with: { group: { columns: { deletedAt: true } } },
  });
  if (!member || member.group.deletedAt) throw new Error("Not a group member");

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
  assertRateLimit(`save-entry:${session.user.id}`, 60, 60_000);

  const slot = await db.query.roundChallenges.findFirst({
    where: eq(roundChallenges.id, data.roundChallengeId),
    with: { round: true },
  });
  if (!slot) throw new Error("Challenge not found");

  const { round } = slot;
  const challenge = getChallenge(slot.slug);
  if (!challenge) throw new Error("Challenge not available");

  const member = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.userId, session.user.id),
      eq(groupMembers.groupId, data.groupId),
    ),
    with: { group: true },
  });
  if (!member || member.group.deletedAt) throw new Error("Not a group member");

  // A group only ever plays its own competition's board.
  if (member.group.competition !== round.competition) {
    throw new Error("Round is not part of this group's competition");
  }

  const target = normalizeTarget(
    challenge.targetKind,
    data,
    challenge.requiredSide,
  );

  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ status: rounds.status, lockAt: rounds.lockAt })
      .from(rounds)
      .where(eq(rounds.id, round.id))
      .for("update");
    if (locked?.status !== "open" || new Date() >= locked.lockAt) {
      throw new Error("Round already locked");
    }

    if (target.targetMatchId) {
      const match = await tx.query.matches.findFirst({
        where: and(
          eq(matches.id, target.targetMatchId),
          eq(matches.competition, round.competition),
          eq(matches.season, round.season),
          eq(matches.matchday, round.matchday),
        ),
      });
      if (!match) throw new Error("Match is not in this round");

      const teams = teamsClaimed(challenge.targetKind, target, match);
      if (teams.length > 0) {
        await assertTeamsFree(
          tx,
          session.user.id,
          data.groupId,
          round.id,
          slot.id,
          teams,
        );
      }
    }

    const isJoker = data.isJoker ?? false;
    if (isJoker) {
      await assertJokerFree(
        tx,
        session.user.id,
        data.groupId,
        round.id,
        slot.id,
      );
    }

    const existing = await tx.query.entries.findFirst({
      where: and(
        eq(entries.userId, session.user.id),
        eq(entries.groupId, data.groupId),
        eq(entries.roundChallengeId, slot.id),
      ),
    });

    if (existing) {
      await tx
        .update(entries)
        .set({ ...target, isJoker, updatedAt: new Date() })
        .where(eq(entries.id, existing.id));
    } else {
      await tx.insert(entries).values({
        id: generateId(),
        userId: session.user.id,
        groupId: data.groupId,
        roundChallengeId: slot.id,
        roundId: round.id,
        isJoker,
        ...target,
      });
    }
  });

  revalidateEntries();
}

type QueryClient = Pick<typeof db, "query">;

/** The joker is one per round: refuse rather than silently move it. */
async function assertJokerFree(
  client: QueryClient,
  userId: string,
  groupId: string,
  roundId: string,
  slotId: string,
) {
  const other = await client.query.entries.findFirst({
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
  client: QueryClient,
  userId: string,
  groupId: string,
  roundId: string,
  slotId: string,
  teams: string[],
) {
  const others = await client.query.entries.findMany({
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
      throw new Error(
        `${clash} is already picked in another challenge this round`,
      );
    }
  }
}

export async function copyEntriesFromGroup(data: {
  sourceGroupId: string;
  targetGroupId: string;
}) {
  const session = await requireSession();
  assertRateLimit(`copy-entries:${session.user.id}`, 10, 60_000);

  if (data.sourceGroupId === data.targetGroupId) {
    throw new Error("Cannot copy a group onto itself");
  }

  const [sourceMember, targetMember] = await Promise.all([
    db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.userId, session.user.id),
        eq(groupMembers.groupId, data.sourceGroupId),
      ),
      with: { group: true },
    }),
    db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.userId, session.user.id),
        eq(groupMembers.groupId, data.targetGroupId),
      ),
      with: { group: true },
    }),
  ]);

  if (
    !sourceMember ||
    sourceMember.group.deletedAt ||
    !targetMember ||
    targetMember.group.deletedAt
  ) {
    throw new Error("Not a group member");
  }
  if (sourceMember.group.competition !== targetMember.group.competition) {
    throw new Error("Groups are not in the same competition");
  }

  const round = await getCurrentRound(targetMember.group.competition);
  if (!round) throw new Error("Round not found");

  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ status: rounds.status, lockAt: rounds.lockAt })
      .from(rounds)
      .where(eq(rounds.id, round.id))
      .for("update");
    if (locked?.status !== "open" || new Date() >= locked.lockAt) {
      throw new Error("Round already locked");
    }

    const sourceEntries = await tx.query.entries.findMany({
      where: and(
        eq(entries.userId, session.user.id),
        eq(entries.groupId, data.sourceGroupId),
        eq(entries.roundId, round.id),
      ),
    });
    if (sourceEntries.length === 0) {
      throw new Error("No predictions to copy");
    }

    // Replace the whole board so the copied set stays internally valid
    // (one joker, no team reused across slots).
    await tx
      .delete(entries)
      .where(
        and(
          eq(entries.userId, session.user.id),
          eq(entries.groupId, data.targetGroupId),
          eq(entries.roundId, round.id),
        ),
      );

    await tx.insert(entries).values(
      sourceEntries.map((entry) => ({
        id: generateId(),
        userId: session.user.id,
        groupId: data.targetGroupId,
        roundChallengeId: entry.roundChallengeId,
        roundId: entry.roundId,
        targetMatchId: entry.targetMatchId,
        targetSide: entry.targetSide,
        predictedHome: entry.predictedHome,
        predictedAway: entry.predictedAway,
        numericValue: entry.numericValue,
        targetsJson: entry.targetsJson,
        isJoker: entry.isJoker,
      })),
    );
  });

  revalidateEntries();
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
