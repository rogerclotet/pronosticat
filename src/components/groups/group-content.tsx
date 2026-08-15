import { GroupTabView } from "@/components/groups/group-tab-view";
import { PointsChart } from "@/components/groups/points-chart";
import { getCspNonce } from "@/lib/csp";
import { getCachedActiveGroup, getCachedSession } from "@/lib/queries/cached";
import { getGroupMembers, getStandings } from "@/lib/queries/groups";
import { getPointsHistory } from "@/lib/queries/points-history";

export async function GroupContent() {
  const session = await getCachedSession();
  if (!session) return null;

  const activeGroup = await getCachedActiveGroup(session.user.id);
  if (!activeGroup) return null;

  const [standings, members, history, nonce] = await Promise.all([
    getStandings(activeGroup.id),
    getGroupMembers(activeGroup.id),
    getPointsHistory(
      activeGroup.id,
      activeGroup.competition,
      activeGroup.startingPoints,
    ),
    getCspNonce(),
  ]);

  const viewer = members.find((m) => m.userId === session.user.id);

  return (
    <GroupTabView
      standings={standings}
      activeGroup={{
        id: activeGroup.id,
        name: activeGroup.name,
        competition: activeGroup.competition,
        inviteCode: activeGroup.inviteCode,
      }}
      memberCount={members.length}
      viewerIsAdmin={viewer?.isAdmin ?? false}
      viewerUserId={session.user.id}
      chart={
        history ? (
          <PointsChart
            history={history}
            viewerUserId={session.user.id}
            nonce={nonce}
          />
        ) : null
      }
    />
  );
}
