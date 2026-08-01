import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import {
  getActiveGroup,
  getUserGroups,
  getHomeSummary,
  getCurrentRoundMatches,
  getUserPredictions,
} from "@/lib/actions/groups";
import { MatchCard } from "@/components/matches/match-card";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/routing";

export default async function HomePage() {
  const session = await getSession();
  if (!session) return null;

  const t = await getTranslations();
  const activeGroup = await getActiveGroup(session.user.id);

  if (!activeGroup) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-black uppercase">{t("home.title")}</h1>
        <p className="mt-4 text-muted">{t("home.noGroups")}</p>
        <Link
          href="/group"
          className="mt-6 border-2 border-teal bg-teal px-6 py-3 font-bold uppercase text-background"
        >
          {t("home.createGroup")}
        </Link>
      </div>
    );
  }

  const userGroups = await getUserGroups(session.user.id);
  const summary = await getHomeSummary(session.user.id, activeGroup.id);
  const roundMatches = await getCurrentRoundMatches(activeGroup.competition);
  const userPreds = await getUserPredictions(
    session.user.id,
    activeGroup.id,
    roundMatches.map((m) => m.id),
  );
  const predMap = new Map(userPreds.map((p) => [p.matchId, p]));
  const upcoming = roundMatches
    .filter((m) => m.status === "scheduled")
    .slice(0, 3);

  return (
    <div className="space-y-6 p-4">
      <header>
        <h1 className="text-2xl font-black uppercase tracking-tight">
          {t("home.title")}
        </h1>
        <p className="text-sm text-muted">{activeGroup.name}</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={t("home.yourPoints")} value={summary.points} />
        <StatCard
          label={t("home.activePredictions")}
          value={summary.activePredictions}
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider">
            {t("home.upcomingMatches")}
          </h2>
          <Link
            href="/predictions"
            className="text-xs font-bold uppercase text-teal"
          >
            {t("nav.predictions")} →
          </Link>
        </div>
        <div className="space-y-3">
          {upcoming.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">{t("predictions.noMatches")}</p>
            </Card>
          ) : (
            upcoming.map((match) => {
              const pred = predMap.get(match.id);
              return (
                <MatchCard
                  key={match.id}
                  homeTeam={match.homeTeam}
                  awayTeam={match.awayTeam}
                  kickoff={match.kickoff}
                  status={match.status}
                  homeTeamCrest={match.homeTeamCrest}
                  awayTeamCrest={match.awayTeamCrest}
                  prediction={
                    pred
                      ? {
                          homeScore: pred.homeScore,
                          awayScore: pred.awayScore,
                          wager: pred.wager,
                        }
                      : null
                  }
                  locked={!!pred?.lockedAt}
                />
              );
            })
          )}
        </div>
      </section>

      {summary.recentResults.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider">
            {t("home.recentResults")}
          </h2>
          <div className="space-y-3">
            {summary.recentResults.map((pred) => (
              <MatchCard
                key={pred.id}
                homeTeam={pred.match.homeTeam}
                awayTeam={pred.match.awayTeam}
                homeScore={pred.match.homeScore}
                awayScore={pred.match.awayScore}
                kickoff={pred.match.kickoff}
                status={pred.match.status}
                prediction={{
                  homeScore: pred.homeScore,
                  awayScore: pred.awayScore,
                  wager: pred.wager,
                }}
                locked
              />
            ))}
          </div>
        </section>
      )}

      {userGroups.length > 1 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider">
            {t("home.yourGroups")}
          </h2>
          <div className="space-y-2">
            {userGroups.map((g) => (
              <Card key={g.id} className="flex justify-between">
                <span className="font-bold">{g.name}</span>
                <span className="font-bold text-teal">{g.points} pts</span>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="text-center">
      <p className="text-3xl font-black tabular-nums text-teal">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted">
        {label}
      </p>
    </Card>
  );
}
