import { ProfileView } from "@/components/profile/profile-view";
import { getCachedActiveGroup, getCachedSession } from "@/lib/queries/cached";
import { getMatchdayHistory, getProfileSummary } from "@/lib/queries/stats";

export async function ProfileContent() {
  const session = await getCachedSession();
  if (!session) return null;

  const activeGroup = await getCachedActiveGroup(session.user.id);
  if (!activeGroup) return null;

  const [summary, history] = await Promise.all([
    getProfileSummary(session.user.id, activeGroup.id),
    getMatchdayHistory(session.user.id, activeGroup.id),
  ]);

  return (
    <ProfileView
      userName={session.user.name}
      summary={summary}
      history={history}
      competition={activeGroup.competition}
    />
  );
}
