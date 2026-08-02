import { PredictionsView } from "@/components/predictions/predictions-view";
import { getCurrentMatchday, getCurrentRoundMatches } from "@/lib/queries/matches";
import {
  getCachedActiveGroup,
  getCachedMemberPoints,
  getCachedSession,
  getCachedUserPredictions,
} from "@/lib/queries/cached";

export async function PredictionsContent() {
  const session = await getCachedSession();
  if (!session) return null;

  const activeGroup = await getCachedActiveGroup(session.user.id);
  if (!activeGroup) return null;

  const roundMatches = await getCurrentRoundMatches(activeGroup.competition);
  const matchday =
    roundMatches[0]?.matchday ??
    (await getCurrentMatchday(activeGroup.competition));
  const matchIds = roundMatches.map((m) => m.id);

  const [userPreds, points] = await Promise.all([
    getCachedUserPredictions(session.user.id, activeGroup.id, matchIds),
    getCachedMemberPoints(session.user.id, activeGroup.id),
  ]);

  return (
    <PredictionsView
      matches={roundMatches.map((m) => ({
        id: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        kickoff: m.kickoff.toISOString(),
        status: m.status,
      }))}
      predictions={userPreds.map((p) => ({
        id: p.id,
        matchId: p.matchId,
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        wager: p.wager,
        pointsAwarded: p.pointsAwarded,
      }))}
      groupId={activeGroup.id}
      matchday={matchday}
      maxPoints={points}
      maxWagerPerMatch={activeGroup.maxWagerPerMatch}
    />
  );
}
