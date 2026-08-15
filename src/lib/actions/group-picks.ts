"use server";

import { and, eq } from "drizzle-orm";
import {
  describePick,
  toBoardMatch,
  toEntryView,
} from "@/components/challenges/types";
import { db } from "@/lib/db";
import { groups } from "@/lib/db/schema";
import {
  getGroupEntries,
  getGroupMembers,
  isGroupMember,
  liveGroup,
} from "@/lib/queries/groups";
import { getCurrentRoundBoard } from "@/lib/queries/round-board";
import { requireSession } from "@/lib/session";

export type GroupPickEntry = {
  userId: string;
  name: string;
  label: string;
  isJoker: boolean;
};

export type GroupPickSlot = {
  slug: string;
  picks: GroupPickEntry[];
};

export type GroupPicksData = {
  matchday: number | null;
  /** Picks stay hidden until the round locks, same rule as the rival sheet. */
  masked: boolean;
  slots: GroupPickSlot[];
};

/**
 * Every group member's picks for the round in play, grouped by board slot.
 * Masking happens here rather than in the component so an open round's
 * picks never leave the server in the first place.
 */
export async function getGroupPicksData(
  groupId: string,
): Promise<GroupPicksData> {
  const session = await requireSession();

  const viewerIsMember = await isGroupMember(session.user.id, groupId);
  if (!viewerIsMember) throw new Error("Not a group member");

  const group = await db.query.groups.findFirst({
    where: and(eq(groups.id, groupId), liveGroup),
    columns: { competition: true },
  });
  if (!group) throw new Error("Group not found");

  const board = await getCurrentRoundBoard(group.competition);
  if (!board) return { matchday: null, masked: false, slots: [] };

  const masked = board.round.status === "open";
  if (masked)
    return { matchday: board.round.matchday, masked: true, slots: [] };

  const [members, groupEntries] = await Promise.all([
    getGroupMembers(groupId),
    getGroupEntries(groupId, board.round.id),
  ]);

  const nameByUserId = new Map(members.map((m) => [m.userId, m.user.name]));
  const boardMatches = board.matches.map(toBoardMatch);

  const entriesBySlot = new Map<string, (typeof groupEntries)[number][]>();
  for (const entry of groupEntries) {
    const list = entriesBySlot.get(entry.roundChallengeId);
    if (list) list.push(entry);
    else entriesBySlot.set(entry.roundChallengeId, [entry]);
  }

  const slots = board.slots.flatMap<GroupPickSlot>((slot) => {
    const picks = (entriesBySlot.get(slot.id) ?? []).flatMap<GroupPickEntry>(
      (entry) => {
        const label = describePick(slot, toEntryView(entry), boardMatches);
        if (label === null) return [];
        return [
          {
            userId: entry.userId,
            name: nameByUserId.get(entry.userId) ?? "",
            label,
            isJoker: entry.isJoker,
          },
        ];
      },
    );
    picks.sort((a, b) => a.name.localeCompare(b.name));
    if (picks.length === 0) return [];
    return [{ slug: slot.slug, picks }];
  });

  return { matchday: board.round.matchday, masked: false, slots };
}
