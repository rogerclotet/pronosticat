import { notFound } from "next/navigation";
import { DevFixturesAdmin } from "@/components/dev/dev-fixtures-admin";
import { getDevFixturesAction } from "@/lib/dev/actions";
import { isDevFixturesEnabled } from "@/lib/dev/guard";

export const metadata = {
  title: "Dev Fixtures · Pronosticat",
};

export default async function DevFixturesPage() {
  if (!isDevFixturesEnabled()) {
    notFound();
  }

  const matches = await getDevFixturesAction();

  return (
    <DevFixturesAdmin
      initialMatches={matches.map((match) => ({
        ...match,
        kickoff: new Date(match.kickoff),
      }))}
    />
  );
}
