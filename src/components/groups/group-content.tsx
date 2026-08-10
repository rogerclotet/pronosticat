import { GroupTabView } from "@/components/groups/group-tab-view";
import { getStandings, getGroupMembers } from "@/lib/queries/groups";
import { getCachedActiveGroup, getCachedSession } from "@/lib/queries/cached";

export async function GroupContent() {
  const session = await getCachedSession();
  if (!session) return null;

  const activeGroup = await getCachedActiveGroup(session.user.id);
  if (!activeGroup) return null;

  const [standings, members] = await Promise.all([
    getStandings(activeGroup.id),
    getGroupMembers(activeGroup.id),
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
    />
  );
}
