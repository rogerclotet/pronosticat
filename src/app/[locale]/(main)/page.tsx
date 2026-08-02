import { getSession } from "@/lib/session";
import {
  getActiveGroup,
  getCurrentRoundMatches,
  getUserPredictions,
  getMemberPoints,
} from "@/lib/actions/groups";
import { fetchCurrentMatchday } from "@/lib/football/api";
import { COMPETITIONS } from "@/lib/constants";
import { JornadaView } from "@/components/jornada/jornada-view";

export default async function JornadaPage() {
  const session = await getSession();
  if (!session) return null;

  const activeGroup = await getActiveGroup(session.user.id);
  if (!activeGroup) return null;

  const roundMatches = await getCurrentRoundMatches(activeGroup.competition);
  const matchday =
    roundMatches[0]?.matchday ??
    (await fetchCurrentMatchday(COMPETITIONS[activeGroup.competition].footballDataCode));
  const [userPreds, maxPoints] = await Promise.all([
    getUserPredictions(
      session.user.id,
      activeGroup.id,
      roundMatches.map((m) => m.id),
    ),
    getMemberPoints(session.user.id, activeGroup.id),
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
    />
  );
}
