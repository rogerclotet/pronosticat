"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import {
  getStandings,
  getUserEntries,
  isGroupMember,
} from "@/lib/queries/groups";
import { getRivalStats, getWeeklyDelta, type RivalStats } from "@/lib/queries/stats";
import { getCurrentRoundBoard } from "@/lib/queries/round-board";
import {
  describePick,
  toBoardMatch,
  toEntryView,
} from "@/components/challenges/types";

export type RivalPick = {
  slug: string;
  /** `null` while the round is open — the pick is not sent to the client at all. */
  label: string | null;
  isJoker: boolean;
  pointsAwarded: number | null;
};

export type RivalSheetData = {
  name: string;
  points: number;
  weeklyDelta: number;
  stats: RivalStats;
  matchday: number | null;
  /** Picks are hidden until the round locks, so nobody can copy them. */
  masked: boolean;
  picks: RivalPick[];
};

/**
 * Everything the rival sheet renders, resolved server-side. Masking happens
 * here rather than in the component so an open round's picks never leave the
 * server in the first place.
 */
export async function getRivalSheetData(
  groupId: string,
  rivalUserId: string,
): Promise<RivalSheetData> {
  const session = await requireSession();

  const [viewerIsMember, rivalIsMember] = await Promise.all([
    isGroupMember(session.user.id, groupId),
    isGroupMember(rivalUserId, groupId),
  ]);
  if (!viewerIsMember || !rivalIsMember) throw new Error("Not a group member");

  // The board follows the group's own competition, never a caller-supplied one.
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
    columns: { competition: true },
  });
  if (!group) throw new Error("Group not found");

  const [board, standings, stats, weeklyDelta] = await Promise.all([
    getCurrentRoundBoard(group.competition),
    getStandings(groupId),
    getRivalStats(groupId, rivalUserId),
    getWeeklyDelta(rivalUserId, groupId),
  ]);

  const row = standings.find((s) => s.userId === rivalUserId);
  const header = {
    name: row?.name ?? "",
    points: row?.points ?? 0,
    weeklyDelta,
    stats,
  };

  if (!board) {
    return { ...header, matchday: null, masked: false, picks: [] };
  }

  const masked = board.round.status === "open";
  const rivalEntries = await getUserEntries(
    rivalUserId,
    groupId,
    board.round.id,
  );
  const boardMatches = board.matches.map(toBoardMatch);
  const entryBySlot = new Map(
    rivalEntries.map((e) => [e.roundChallengeId, toEntryView(e)]),
  );

  const picks = board.slots.flatMap<RivalPick>((slot) => {
    const entry = entryBySlot.get(slot.id);
    if (!entry) return [];
    return [
      {
        slug: slot.slug,
        label: masked ? null : describePick(slot, entry, boardMatches),
        isJoker: entry.isJoker,
        pointsAwarded: masked ? null : entry.pointsAwarded,
      },
    ];
  });

  return { ...header, matchday: board.round.matchday, masked, picks };
}
