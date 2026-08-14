export type RankedMember = {
  userId: string;
  name: string;
  points: number;
};

/** Competition ranking: 1, 2, 2, 4. */
export function competitionRanks(
  members: readonly RankedMember[],
): Map<string, number> {
  const sorted = [...members].toSorted((a, b) => b.points - a.points);
  const ranks = new Map<string, number>();
  let lastPoints: number | null = null;
  let lastRank = 0;
  let index = 0;
  for (const member of sorted) {
    index += 1;
    if (lastPoints === null || member.points !== lastPoints) {
      lastRank = index;
      lastPoints = member.points;
    }
    ranks.set(member.userId, lastRank);
  }
  return ranks;
}

export type RankShift = {
  userId: string;
  name: string;
  points: number;
  prevRank: number;
  newRank: number;
  overtookName: string | null;
  overtakenByName: string | null;
  isFirst: boolean;
  isLast: boolean;
};

export function rankShifts(
  before: readonly RankedMember[],
  after: readonly RankedMember[],
): RankShift[] {
  const prev = competitionRanks(before);
  const next = competitionRanks(after);
  const worst = Math.max(0, ...next.values());

  const shifts: RankShift[] = [];
  for (const member of after) {
    const prevRank = prev.get(member.userId);
    const newRank = next.get(member.userId);
    if (prevRank == null || newRank == null || prevRank === newRank) continue;

    const overtook = after.filter((other) => {
      const theirPrev = prev.get(other.userId);
      const theirNew = next.get(other.userId);
      if (theirPrev == null || theirNew == null) return false;
      return theirPrev < prevRank && theirNew > newRank;
    });
    overtook.sort(
      (a, b) => (next.get(a.userId) ?? 0) - (next.get(b.userId) ?? 0),
    );

    const passedBy = after.filter((other) => {
      const theirPrev = prev.get(other.userId);
      const theirNew = next.get(other.userId);
      if (theirPrev == null || theirNew == null) return false;
      return theirPrev > prevRank && theirNew < newRank;
    });
    passedBy.sort(
      (a, b) => (next.get(a.userId) ?? 0) - (next.get(b.userId) ?? 0),
    );
    const immediatelyAbove = passedBy.find(
      (other) => (next.get(other.userId) ?? 0) === newRank - 1,
    );

    shifts.push({
      userId: member.userId,
      name: member.name,
      points: member.points,
      prevRank,
      newRank,
      overtookName: overtook[0]?.name ?? null,
      overtakenByName: immediatelyAbove?.name ?? passedBy.at(-1)?.name ?? null,
      isFirst: newRank === 1,
      isLast: newRank === worst && after.length >= 3,
    });
  }
  return shifts;
}

export function titleRaceSnapshot(members: readonly RankedMember[]): {
  leader: RankedMember;
  second: RankedMember;
  gap: number;
} | null {
  if (members.length < 2) return null;
  const sorted = [...members].toSorted((a, b) => b.points - a.points);
  const leader = sorted[0];
  const second = sorted[1];
  return { leader, second, gap: leader.points - second.points };
}
