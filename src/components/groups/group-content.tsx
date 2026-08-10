import { GroupTabView } from "@/components/groups/group-tab-view";
import { getStandings, getGroupMembers } from "@/lib/actions/groups";
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
      standings={standings.map((s) => ({
        userId: s.userId,
        name: s.name,
        points: s.points,
        picksSettled: s.picksSettled,
        hits: Number(s.hits),
        misses: Number(s.misses),
      }))}
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
