export type RankedMember = {
  userId: string;
  name: string;
  points: number;
};

/**
 * Competition ranking: 1, 2, 2, 4. Shared by the standings table and the rank
 * notifications so a player tied for first is never told one thing and shown
 * another.
 */
export function competitionRanks(
  members: readonly RankedMember[],
): Map<string, number> {
  const sorted = [...members].toSorted(byPointsThenName);
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

/** Points first, then name so tied members keep a stable order between renders. */
export function byPointsThenName(a: RankedMember, b: RankedMember): number {
  if (b.points !== a.points) return b.points - a.points;
  return a.name.localeCompare(b.name);
}
