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
import { getStartedRounds } from "@/lib/queries/matchday";
import {
  getCurrentRoundBoard,
  loadRoundBoard,
  type RoundOption,
} from "@/lib/queries/round-board";
import { requireSession } from "@/lib/session";

export type GroupPickEntry = {
  userId: string;
  name: string;
  label: string;
  isJoker: boolean;
  /** `null` until the round is settled. */
  pointsAwarded: number | null;
};

export type GroupPickSlot = {
  slug: string;
  picks: GroupPickEntry[];
};

export type GroupRoundTotal = {
  userId: string;
  name: string;
  points: number;
};

export type GroupPicksData = {
  roundId: string | null;
  matchday: number | null;
  /** Picks stay hidden until the round locks, same rule as the rival sheet. */
  masked: boolean;
  /** Every round that has kicked off, newest first. */
  options: RoundOption[];
  slots: GroupPickSlot[];
  /** Round standings, best first. Empty until the round is settled. */
  totals: GroupRoundTotal[];
};

const EMPTY: GroupPicksData = {
  roundId: null,
  matchday: null,
  masked: false,
  options: [],
  slots: [],
  totals: [],
};

/**
 * Every group member's picks for a round, grouped by board slot. Defaults to
 * the round in play and reaches back over the ones already played. Masking
 * happens here rather than in the component so an open round's picks never
 * leave the server in the first place.
 */
export async function getGroupPicksData(
  groupId: string,
  roundId?: string,
): Promise<GroupPicksData> {
  const session = await requireSession();

  const viewerIsMember = await isGroupMember(session.user.id, groupId);
  if (!viewerIsMember) throw new Error("Not a group member");

  const group = await db.query.groups.findFirst({
    where: and(eq(groups.id, groupId), liveGroup),
    columns: { competition: true },
  });
  if (!group) throw new Error("Group not found");

  // Only a round of this group's own competition is addressable: the id comes
  // from the client, so it is matched against the list rather than trusted.
  const started = await getStartedRounds(group.competition);
  const requested = started.find((round) => round.id === roundId);
  const board = requested
    ? await loadRoundBoard(group.competition, requested)
    : await getCurrentRoundBoard(group.competition);
  if (!board) return EMPTY;

  const options: RoundOption[] = started.map((round) => ({
    id: round.id,
    season: round.season,
    matchday: round.matchday,
  }));
  // The round in play has not necessarily kicked off, and the picker still has
  // to be able to name the round it opens on.
  if (!options.some((option) => option.id === board.round.id)) {
    options.unshift({
      id: board.round.id,
      season: board.round.season,
      matchday: board.round.matchday,
      open: board.round.status === "open",
    });
  }

  const masked = board.round.status === "open";
  const base = {
    roundId: board.round.id,
    matchday: board.round.matchday,
    options,
  };
  if (masked) return { ...base, masked: true, slots: [], totals: [] };

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

  const settled = board.round.status === "settled";
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
            pointsAwarded: entry.pointsAwarded,
          },
        ];
      },
    );
    // Once the points are in, who won the slot is the interesting order.
    picks.sort((a, b) =>
      settled && a.pointsAwarded !== b.pointsAwarded
        ? (b.pointsAwarded ?? 0) - (a.pointsAwarded ?? 0)
        : a.name.localeCompare(b.name),
    );
    if (picks.length === 0) return [];
    return [{ slug: slot.slug, picks }];
  });

  return { ...base, masked: false, slots, totals: totalsFor(slots, settled) };
}

/** What each member took out of the round, best first. */
function totalsFor(
  slots: GroupPickSlot[],
  settled: boolean,
): GroupRoundTotal[] {
  if (!settled) return [];

  const byUser = new Map<string, GroupRoundTotal>();
  for (const slot of slots) {
    for (const pick of slot.picks) {
      const total = byUser.get(pick.userId) ?? {
        userId: pick.userId,
        name: pick.name,
        points: 0,
      };
      total.points += pick.pointsAwarded ?? 0;
      byUser.set(pick.userId, total);
    }
  }

  return [...byUser.values()].sort(
    (a, b) => b.points - a.points || a.name.localeCompare(b.name),
  );
}
