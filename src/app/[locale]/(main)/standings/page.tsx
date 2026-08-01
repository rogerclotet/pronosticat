import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { getActiveGroup, getStandings } from "@/lib/actions/groups";
import { Link } from "@/i18n/routing";
import { Card } from "@/components/ui/card";

export default async function StandingsPage() {
  const session = await getSession();
  if (!session) return null;

  const t = await getTranslations();
  const activeGroup = await getActiveGroup(session.user.id);

  if (!activeGroup) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted">{t("home.noGroups")}</p>
        <Link href="/group" className="mt-4 inline-block font-bold uppercase text-teal">
          {t("home.createGroup")}
        </Link>
      </div>
    );
  }

  const standings = await getStandings(activeGroup.id);

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-black uppercase tracking-tight">
          {t("standings.title")}
        </h1>
        <p className="text-sm text-muted">{activeGroup.name}</p>
      </header>

      {standings.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">{t("standings.noMembers")}</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-border text-left text-xs uppercase tracking-wider text-muted">
                <th className="p-2">#</th>
                <th className="p-2">{t("standings.player")}</th>
                <th className="p-2 text-right">{t("standings.points")}</th>
                <th className="p-2 text-right">{t("standings.correctResults")}</th>
                <th className="p-2 text-right">{t("standings.correctOutcomes")}</th>
                <th className="p-2 text-right">{t("standings.matchesPredicted")}</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, i) => (
                <tr
                  key={row.userId}
                  className={`border-b border-border ${
                    row.userId === session.user.id ? "bg-surface" : ""
                  }`}
                >
                  <td className="p-2 font-bold tabular-nums">{i + 1}</td>
                  <td className="p-2 font-bold">{row.name}</td>
                  <td className="p-2 text-right font-bold tabular-nums text-teal">
                    {row.points}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {Number(row.correctResults)}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {Number(row.correctOutcomes)}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {row.matchesPredicted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
