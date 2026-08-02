import { getSession } from "@/lib/session";
import { getActiveGroup } from "@/lib/actions/groups";
import { getProfileSummary, getMatchdayHistory } from "@/lib/actions/stats";
import { ProfileView } from "@/components/profile/profile-view";

export default async function PerfilPage() {
  const session = await getSession();
  if (!session) return null;

  const activeGroup = await getActiveGroup(session.user.id);
  if (!activeGroup) return null;

  const [summary, history] = await Promise.all([
    getProfileSummary(session.user.id, activeGroup.id),
    getMatchdayHistory(session.user.id, activeGroup.id),
  ]);

  return (
    <ProfileView summary={summary} history={history} competition={activeGroup.competition} />
  );
}
