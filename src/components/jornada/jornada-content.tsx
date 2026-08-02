import { JornadaView } from "@/components/jornada/jornada-view";
import { getCurrentMatchday, getCurrentRoundMatches } from "@/lib/queries/matches";
import {
  getCachedActiveGroup,
  getCachedMemberPoints,
  getCachedSession,
  getCachedUserPredictions,
} from "@/lib/queries/cached";

export async function JornadaContent() {
  const session = await getCachedSession();
  if (!session) return null;

  const activeGroup = await getCachedActiveGroup(session.user.id);
  if (!activeGroup) return null;

  const roundMatches = await getCurrentRoundMatches(activeGroup.competition);
  const matchday =
    roundMatches[0]?.matchday ??
    (await getCurrentMatchday(activeGroup.competition));
  const matchIds = roundMatches.map((m) => m.id);

  const [userPreds, maxPoints] = await Promise.all([
    getCachedUserPredictions(session.user.id, activeGroup.id, matchIds),
    getCachedMemberPoints(session.user.id, activeGroup.id),
  ]);

  return (
    <JornadaView
      matches={roundMatches.map((m) => ({
        id: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        kickoff: m.kickoff.toISOString(),
        status: m.status,
        homeTeamCrest: m.homeTeamCrest,
        awayTeamCrest: m.awayTeamCrest,
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
      competition={activeGroup.competition}
      maxPoints={maxPoints}
      maxWagerPerMatch={activeGroup.maxWagerPerMatch}
    />
  );
}
