import { PredictionsView } from "@/components/predictions/predictions-view";
import { getSession } from "@/lib/session";
import {
  getActiveGroup,
  getCurrentRoundMatches,
  getUserPredictions,
  getMemberPoints,
} from "@/lib/actions/groups";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { fetchCurrentMatchday } from "@/lib/football/api";
import { COMPETITIONS } from "@/lib/constants";

export default async function PredictionsPage() {
  const session = await getSession();
  if (!session) return null;

  const t = await getTranslations();
  const activeGroup = await getActiveGroup(session.user.id);

  if (!activeGroup) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted">{t("home.noGroups")}</p>
        <Link href="/group" className="mt-4 inline-block text-teal font-bold uppercase">
          {t("home.createGroup")}
        </Link>
      </div>
    );
  }

  const roundMatches = await getCurrentRoundMatches(activeGroup.competition);
  const matchday = roundMatches[0]?.matchday ?? await fetchCurrentMatchday(
    COMPETITIONS[activeGroup.competition].footballDataCode,
  );
  const userPreds = await getUserPredictions(
    session.user.id,
    activeGroup.id,
    roundMatches.map((m) => m.id),
  );
  const points = await getMemberPoints(session.user.id, activeGroup.id);

  return (
    <PredictionsView
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
        lockedAt: p.lockedAt?.toISOString() ?? null,
      }))}
      groupId={activeGroup.id}
      matchday={matchday}
      maxPoints={points}
    />
  );
}
