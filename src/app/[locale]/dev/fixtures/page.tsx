import { notFound } from "next/navigation";
import { DevFixturesAdmin } from "@/components/dev/dev-fixtures-admin";
import { getDevFixturesAction, getDevRoundsAction } from "@/lib/dev/actions";
import { isDevFixturesEnabled } from "@/lib/dev/guard";

export const metadata = {
  title: "Dev Fixtures · Pronosticat",
};

export default async function DevFixturesPage() {
  if (!isDevFixturesEnabled()) {
    notFound();
  }

  const [matches, rounds] = await Promise.all([
    getDevFixturesAction(),
    getDevRoundsAction(),
  ]);

  return (
    <DevFixturesAdmin
      initialMatches={matches.map((match) => ({
        ...match,
        kickoff: new Date(match.kickoff),
      }))}
      rounds={rounds.map((round) => ({
        id: round.id,
        competition: round.competition,
        matchday: round.matchday,
        status: round.status,
        lockAt: new Date(round.lockAt),
        challengeCount: round.challenges.length,
      }))}
    />
  );
}
